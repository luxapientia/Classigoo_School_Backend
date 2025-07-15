import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as moment from 'moment';
import * as randomstring from 'randomstring';
import { v4 as uuidv4 } from 'uuid';
import { User } from './schemas/user.schema';
import { School } from './schemas/school.schema';
import { SchoolStaff } from './schemas/school_staff.schema';
import { CommunityMember } from './schemas/community_member.schema';
import { Otp } from './schemas/otp.schema';
import { Session } from './schemas/session.schema';
import { Blacklist } from './schemas/blacklist.schema';
import { AuthNotification } from './schemas/notification.schema';
import { MailService } from '../../common/utils/mail.service';
import { SendOtpDto, ValidateOtpDto, ResendOtpDto } from './dto/auth.dto';

// Default avatar generation function
const generateAvatar = (username: string): string => {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`;
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(School) private schoolRepo: Repository<School>,
    @InjectRepository(SchoolStaff) private schoolStaffRepo: Repository<SchoolStaff>,
    @InjectRepository(CommunityMember) private communityMemberRepo: Repository<CommunityMember>,
    @InjectRepository(Otp) private otpRepo: Repository<Otp>,
    @InjectRepository(Session) private sessionRepo: Repository<Session>,
    @InjectRepository(Blacklist) private blacklistRepo: Repository<Blacklist>,
    @InjectRepository(AuthNotification) private notificationRepo: Repository<AuthNotification>,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  private readonly schoolStaffRoles = ['principal', 'assistant_principal', 'teacher', 'staff'];
  private readonly communityMemberRoles = ['student', 'parent', 'class_monitor'];

  async sendOtp(sendOtpDto: SendOtpDto) {
    const {
      email,
      isSignup,
      name: fullName,
      ip,
      platform,
      os,
      device,
      location,
      role,
      school_id,
      remember_me,
      push_token,
    } = sendOtpDto;

    let schoolId = school_id;
    // Check if role is valid
    if (!this.schoolStaffRoles.includes(role) && !this.communityMemberRoles.includes(role)) {
      throw new BadRequestException({
        status: 'error',
        message: 'Role is not valid, Please contact support',
        i18n: 'role_not_valid',
      });
    }
    
    // Check if school staff selected school in signup
    if (this.schoolStaffRoles.includes(role) && isSignup && !schoolId) {
      throw new BadRequestException({
        status: 'error',
        message: 'School is required, Please select a school',
        i18n: 'school_required',
      });
    }

    // Check blacklist
    const blacklist = await this.blacklistRepo.findOne({ where: { ip_address: ip } });
    if (blacklist?.is_blocked) {
      if (moment().utc().isAfter(blacklist.blocked_until)) {
        blacklist.attempts = 0;
        blacklist.blocked_until = null;
        blacklist.is_blocked = false;
        await this.blacklistRepo.save(blacklist);
      } else {
        throw new ForbiddenException({
          status: 'error',
          message:
            'You have exceeded the maximum number of attempts, Please try again later!',
          i18n: 'max_attempts_exceeded',
        });
      }
    }

    // Generate OTP
    const code = randomstring.generate({
      length: 9,
      charset: 'alphanumeric',
      capitalization: 'uppercase',
    });

    // Generate session token
    const session_token = uuidv4();

    // Find or create user
    let user = await this.userRepo.findOne({ where: { email: email.toLowerCase() } });

    if (isSignup) {
      if (user) {
        throw new BadRequestException({
          status: 'error',
          message: 'User already exists, Plesae login to continue',
          i18n: 'user_already_exists',
        });
      }
    } else {
      if (!user) {
        throw new BadRequestException({
          status: 'error',
          message: 'User not found, Please signup to continue',
          i18n: 'user_not_found',
        });
      }
    }
    
    if (!user) {
      let avatar;

      if (fullName) {
        avatar = {
          bucketKey: '',
          url: generateAvatar(fullName),
        };
      }

      user = await this.userRepo.save({
        email: email.toLowerCase(),
        name: fullName,
        role,
        status: 'pending',
        avatar,
        subscription: {
          status: 'inactive',
          updated_at: new Date(),
        },
      });

      if (this.schoolStaffRoles.includes(role) && isSignup) {
        // check if school exists and if not create it
        // const school = await this.schoolRepo.findOne({ where: { id: schoolId } });
        // if (!school) {
        // }
        const newSchool = await this.schoolRepo.save({
          name: school_id,
        });
        schoolId = newSchool.id;

        await this.schoolStaffRepo.save({
          user: { id: user.id },
          school: { id: schoolId },
          is_verified: false
        });
      } else {
        await this.communityMemberRepo.save({
          user: { id: user.id },
          // school: { id: schoolId }
        });
      }

      await this.notificationRepo.save({
        user: { id: user.id },
        icon: process.env.WELCOME_NOTIFICATION_IMAGE_URL,
        title: 'Welcome to Classigoo',
        description:
          'Thank you very much for joining Classigoo. We are very happy to have you here. We hope you will enjoy our service. If you have any questions, please contact our support department.',
      });

      if (!user) {
        throw new InternalServerErrorException({
          status: 'error',
          message: 'Failed to create user, Please try again',
          i18n: 'user_creation_error_failed',
        });
      }
    } else {
      if (user.status === 'banned') {
        throw new ForbiddenException({
          status: 'error',
          message: 'Your account has been banned, Please contact support',
          i18n: 'user_account_banned',
        });
      }

      if (user.status === 'deleted') {
        throw new ForbiddenException({
          status: 'error',
          message: 'Your account has been deleted, Please contact support',
          i18n: 'user_account_deleted',
        });
      }
    }

    // Check for existing OTP
    const oldOTP = await this.otpRepo.findOne({ where: { email: email.toLowerCase(), expired: false } });
    if (oldOTP) {
      const currentTime = moment().utc();
      const expirationTime = moment(oldOTP.updated_at).add(1, 'minutes').utc();

      if (moment(currentTime).isBefore(expirationTime)) {
        throw new BadRequestException({
          message: `Please wait for ${moment.utc(moment(expirationTime).diff(currentTime)).format('mm [minute(s) and] ss [second(s)]')} before requesting new OTP`,
        });
      }
    }

    // Expire old OTPs
    await this.otpRepo.update({ email: email.toLowerCase(), expired: false }, { expired: true });

    // Create new OTP
    await this.otpRepo.save({
      email: email.toLowerCase(),
      otp: code,
      session_token,
      session_remember_me: remember_me,
      security: {
        ip,
        platform: platform || 'unknown',
        os: os || 'unknown',
        device: device || 'unknown',
        location: location || 'unknown',
      },
      push_token,
    });

    // Send email
    const mailSent = await this.mailService.sendMail({
      to: email,
      subject: 'Classigoo - Your OTP for authentication',
      template: 'auth/otp-email',
      context: {
        name: user.name,
        code: code,
      },
    });

    if (!mailSent) {
      throw new InternalServerErrorException({
        status: 'error',
        message: 'Failed to send OTP to your email address, Please try again',
        i18n: 'otp_send_failed',
      });
    }

    return {
      status: 'success',
      message: 'OTP sent to your email address',
      session_token
    };
  }

  async validateOtp(validateOtpDto: ValidateOtpDto) {
    const { ip, otp, session_token } = validateOtpDto;

    // Update blacklist attempts
    // let blacklist = await this.blacklistRepo.findOneAndUpdate({ ip_address: ip }, { $inc: { attempts: 1 } }, { new: true });
    let blacklist = await this.blacklistRepo.findOne({ where: { ip_address: ip } });

    if (blacklist) {
      blacklist.attempts++;
      await this.blacklistRepo.save(blacklist);
    }


    if (!blacklist) {
      blacklist = await this.blacklistRepo.save({
        ip_address: ip,
        attempts: 1,
      });
    }

    if (blacklist.is_blocked) {
      if (moment().utc().isAfter(blacklist.blocked_until)) {
        blacklist.attempts = 0;
        blacklist.blocked_until = null;
        blacklist.is_blocked = false;
        await this.blacklistRepo.save(blacklist);
      } else {
        throw new ForbiddenException({
          status: 'error',
          message:
            'You have exceeded the maximum number of attempts, Please try again later!',
          i18n: 'max_attempts_exceeded',
        });
      }
    }

    if (blacklist.attempts > 5) {
      blacklist.attempts = 0;
      blacklist.blocked_until = moment().utc().add(1, 'days').toDate();
      blacklist.is_blocked = true;
      await this.blacklistRepo.save(blacklist);

      throw new ForbiddenException({
        status: 'error',
        message:
          'You have exceeded the maximum number of attempts, Please try again after 24 hours',
        i18n: 'max_attempts_exceeded_24h',
      });
    }

    // Find OTP
    const dbOTP = await this.otpRepo.findOne({ where: { otp, session_token } });

    if (!dbOTP) {
      throw new BadRequestException({
        status: 'error',
        message: 'Invalid OTP',
        attemptsLeft: 5 - blacklist.attempts,
        i18n: 'invalid_otp',
      });
    }

    if (dbOTP.used) {
      throw new BadRequestException({
        status: 'error',
        message: 'OTP already used',
        attemptsLeft: 5 - blacklist.attempts,
        i18n: 'otp_already_used',
      });
    }

    if (dbOTP.expired) {
      throw new BadRequestException({
        status: 'error',
        message: 'OTP expired',
        attemptsLeft: 5 - blacklist.attempts,
        i18n: 'otp_expired',
      });
    }

    // Check OTP expiration
    const currentTime = moment().utc();
    const expirationTime = moment(dbOTP.updated_at).add(5, 'minutes').utc();

    if (moment(currentTime).isAfter(expirationTime)) {
      await this.otpRepo.update({ otp, session_token }, { expired: true });
      throw new BadRequestException({
        status: 'error',
        message: 'OTP expired',
        attemptsLeft: 5 - blacklist.attempts,
        i18n: 'otp_expired',
      });
    }

    if (dbOTP.security.ip !== ip) {
      throw new BadRequestException({
        status: 'error',
        message:
          'IP address mismatch! Try with same device that you have requested code!',
        attemptsLeft: 5 - blacklist.attempts,
        i18n: 'ip_mismatch',
      });
    }

    // Get user
    const user = await this.userRepo.findOne({ where: { email: dbOTP.email } });

    if (!user) {
      throw new NotFoundException({
        status: 'error',
        message: 'User not found',
        attemptsLeft: 5 - blacklist.attempts,
        i18n: 'user_not_found',
      });
    }

    // Generate JWT token
    const tokenExp = dbOTP.session_remember_me ? '30d' : '1d';
    const token = this.jwtService.sign(
      {
        user_id: user.id,
        session: dbOTP.session_token,
        email: dbOTP.email,
        role: user.role,
      },
      {
        expiresIn: tokenExp,
      }
    );

    // Update OTP
    await this.otpRepo.update({ otp, session_token }, { expired: true, used: true });

    // Create session
    const session_expiry = dbOTP.session_remember_me
      ? moment().utc().add(30, 'days')
      : moment().utc().add(1, 'days');

    await this.sessionRepo.save({
      user: { id: user.id },
      session_token: dbOTP.session_token,
      session_expiry,
      security: {
        ip: dbOTP.security.ip,
        platform: dbOTP.security.platform,
        os: dbOTP.security.os,
        device: dbOTP.security.device,
        location: dbOTP.security.location,
      },
      push_token: dbOTP.push_token,
    });

    await this.userRepo.update({ email: dbOTP.email }, { status: 'active' });

    // verify school staff
    if (this.schoolStaffRoles.includes(user.role)) {
      await this.schoolStaffRepo.update({ user: { id: user.id } }, { is_verified: true });
    }

    // Reset blacklist attempts
    // await this.blacklistRepo.update({ ip_address: ip }, { $set: { attempts: 0 } });
    await this.blacklistRepo.update({ ip_address: ip }, { attempts: 0 });

    // Create notification
    await this.notificationRepo.save({
      user: { id: user.id },
      image_url: process.env.LOGIN_NOTIFICATION_IMAGE_URL,
      title: 'New login',
      description: `New login from ${dbOTP.security.ip}`,
      type: 'info',
      link: '/account/security',
    });

    // Send security alert email
    await this.mailService.sendMail({
      to: user.email,
      subject: `Classigoo - New login detected from ${dbOTP.security.ip}`,
      template: 'auth/login-alert',
      context: {
        name: user.name,
        ip: dbOTP.security.ip,
      },
    });

    return {
      status: 'success',
      message: 'OTP validated successfully',
      token,
      session_expiry,
      i18n: 'otp_validated',
    };
  }

  async resendOtp(resendOtpDto: ResendOtpDto) {
    const { session_token, ip } = resendOtpDto;

    // Find OTP
    const dbOTP = await this.otpRepo.findOne({ where: { session_token } });

    if (!dbOTP) {
      throw new BadRequestException({
        status: 'error',
        message: 'Invalid session token',
        i18n: 'invalid_session_token',
      });
    }

    if (dbOTP.used) {
      throw new BadRequestException({
        status: 'error',
        message: 'OTP already used',
        i18n: 'otp_already_used',
      });
    }

    // Check cooldown period
    const currentTime = moment().utc();
    const expirationTime = moment(dbOTP.updated_at).add(3, 'minutes').utc();

    if (moment(currentTime).isBefore(expirationTime)) {
      throw new BadRequestException({
        message: `Please wait for ${moment.utc(moment(expirationTime).diff(currentTime)).format('mm [minute(s) and] ss [second(s)]')} before requesting new OTP`,
      });
    }

    // Check blacklist
    const blacklist = await this.blacklistRepo.findOne({ where: { ip_address: ip } });
    if (blacklist?.is_blocked) {
      if (moment().utc().isAfter(blacklist.blocked_until)) {
        blacklist.attempts = 0;
        blacklist.blocked_until = null;
        blacklist.is_blocked = false;
        await this.blacklistRepo.save(blacklist);
      } else {
        throw new ForbiddenException({
          status: 'error',
          message:
            'You have exceeded the maximum number of attempts, Please try again later!',
          i18n: 'max_attempts_exceeded',
        });
      }
    }

    // Generate new OTP
    const code = randomstring.generate({
      length: 9,
      charset: 'alphanumeric',
      capitalization: 'uppercase',
    });

    // Update OTP
    await this.otpRepo.update({ session_token }, { otp: code, expired: false, updated_at: moment().utc() });

    // Send email
    const mailSent = await this.mailService.sendMail({
      to: dbOTP.email,
      subject: 'Classigoo - Your OTP for authentication',
      text: `Hi, \r\nWe have received a one time password generation request from your email address. Please use the code below to complete your authentication. Your code is valid for the next 5 minutes.\r\n\r\nYour one time login code is: ${code}\r\n\r\nIf it wasn't you who requested this code, then avoid this email. If you want to track logged-in users, then please login to the classigoo app and visit the security center to monitor logged-in users. For further help please contact our support department\r\n\r\nRegards, \r\nTeam Classigoo`,
    });

    if (!mailSent) {
      throw new InternalServerErrorException({
        status: 'error',
        message: 'Failed to send OTP to your email address, Please try again',
        i18n: 'otp_send_failed',
      });
    }

    return {
      status: 'success',
      message: 'OTP sent to your email address',
      i18n: 'otp_sent',
    };
  }
}
