import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from './schemas/user.schema';
import { School } from './schemas/school.schema';
import { SchoolStaff } from './schemas/school_staff.schema';
import { CommunityMember } from './schemas/community_member.schema';
import { Otp } from './schemas/otp.schema';
import { Session } from './schemas/session.schema';
import { Blacklist } from './schemas/blacklist.schema';
import { AuthNotification } from './schemas/notification.schema';
import { SharedModule } from '../../shared/shared.module';
import { MailService } from '../../common/utils/mail.service';

@Module({
  imports: [
    SharedModule,
    TypeOrmModule.forFeature([
      User,
      SchoolStaff,
      CommunityMember,
      School,
      Otp,
      Session,
      Blacklist,
      AuthNotification,
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, MailService],
  exports: [AuthService],
})
export class AuthModule {}
