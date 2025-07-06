import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PubSubService } from '../../../shared/services/pubsub.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { JwtPayload } from '../../../common/decorators/user.decorator';
import { Classroom } from '../core/schemas/classroom.schema';
import { ClassroomAccess } from '../core/schemas/classroom-access.schema';
import { User } from '../../../modules/auth/schemas/user.schema';
import { Notification } from './schemas/notification.schema';
import { InviteMemberDto, InviteMemberResponse } from './dto/invite-member.dto';
import { RemoveMemberDto, RemoveMemberResponse } from './dto/remove-member.dto';
import { ChangeRoleDto, ChangeRoleResponse } from './dto/change-role.dto';
import { MailService } from '../../../common/utils/mail.service';

@Injectable()
export class MemberService {
  constructor(
    @InjectRepository(Classroom)
    private classroomRepository: Repository<Classroom>,
    @InjectRepository(ClassroomAccess)
    private classroomAccessRepository: Repository<ClassroomAccess>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private readonly mailService: MailService,
    private readonly pubSubService: PubSubService,
  ) {}

  async inviteMember(inviteMemberDto: InviteMemberDto, user: JwtPayload): Promise<InviteMemberResponse> {
    try {
      const { class_id, email, role } = inviteMemberDto;

      // Check if classroom exists
      const classroom = await this.classroomRepository.findOne({ where: { id: class_id } });
      if (!classroom) {
        throw new NotFoundException('Classroom not found');
      }

      // Check if current user has permission
      const currentUserAccess = await this.classroomAccessRepository.findOne({
        where: {
          classroom: { id: class_id },
          user: { id: user.user_id },
          status: 'accepted',
          role: In(['owner', 'teacher'])
        }
      });

      if (!currentUserAccess) {
        throw new BadRequestException('You do not have permission to invite members');
      }

      // Get current user details
      const currentUserData = await this.userRepository.findOne({ where: { id: user.user_id } });
      if (!currentUserData) {
        throw new BadRequestException('Current user not found');
      }

      // Find user by email
      const invitedUser = await this.userRepository.findOne({ where: { email } });
      if (!invitedUser) {
        throw new BadRequestException('The user does not exist');
      }

      // Check if user is already a member
      const existingAccess = await this.classroomAccessRepository.findOne({
        where: {
          classroom: { id: class_id },
          user: { id: invitedUser.id }
        }
      });

      if (existingAccess) {
        throw new BadRequestException('User is already a member of the classroom');
      }

      // Create access
      const classroomAccess = await this.classroomAccessRepository.save({
        classroom: { id: class_id },
        user: { id: invitedUser.id },
        role,
        status: 'pending'
      });

      if (!classroomAccess) {
        throw new InternalServerErrorException('Failed to invite user');
      }

      // Publish event
      await this.pubSubService.publish('classroom.updated', {
        id: class_id,
      })

      // Create notification
      await this.notificationRepository.save({
        user: { id: invitedUser.id },
        image: process.env.NOTIFICATION_JOIN_CLASSROOM_IMAGE_URL,
        content: `${currentUserData.name} invited you to join a classroom`,
        link: `/classrooms?action=join&code=${class_id}`,
        is_read: false
      });

      // Send invitation email
      await this.mailService.sendMail({
        to: invitedUser.email,
        subject: 'You have been invited to join a classroom',
        text: `You have been invited to join a classroom by ${currentUserData.name}.\n\n` +
              `Click here to accept: ${process.env.FRONTEND_URL}/classroom/${class_id}/join?code=${classroom.invitation_code}\n\n` +
              `Click here to decline: ${process.env.FRONTEND_URL}/classroom/${class_id}/leave`
      });

      return {
        status: 'success',
        message: 'Successfully invited member'
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not invite member');
    }
  }

  async removeMember(removeMemberDto: RemoveMemberDto, user: JwtPayload): Promise<RemoveMemberResponse> {
    try {
      const { relation_id } = removeMemberDto;

      // Get access details
      const access = await this.classroomAccessRepository.findOne({ 
        where: { id: relation_id },
        relations: ['classroom', 'user']
      });
      if (!access) {
        throw new NotFoundException('Relation not found');
      }

      // Check if trying to remove owner
      if (access.role === 'owner') {
        throw new BadRequestException('The owner cannot be removed');
      }

      // If self-removal
      if (access.user.id === user.user_id) {
        await this.classroomAccessRepository.delete(relation_id);
        return {
          status: 'success',
          message: 'Successfully left classroom'
        };
      }

      // Check if current user has permission
      const currentUserAccess = await this.classroomAccessRepository.findOne({
        where: {
          classroom: { id: access.classroom.id },
          user: { id: user.user_id },
          status: 'accepted',
          role: In(['owner', 'teacher'])
        }
      });

      if (!currentUserAccess) {
        throw new BadRequestException('You do not have permission to remove members');
      }

      // Remove member
      await this.classroomAccessRepository.delete(relation_id);

      // Publish event
      await this.pubSubService.publish('classroom.updated', {
        id: access.classroom.id,
      })

      await this.pubSubService.publish('classroom.member.updated', {
        id: access.classroom.id,
        data: {
          user_id: access.user.id,
          role: access.role,
        }
      })

      return {
        status: 'success',
        message: 'Successfully removed member'
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not remove member');
    }
  }

  async changeRole(changeRoleDto: ChangeRoleDto, user: JwtPayload): Promise<ChangeRoleResponse> {
    try {
      const { id: accessId, role } = changeRoleDto;

      // Get access details
      const access = await this.classroomAccessRepository.findOne({
        where: { id: accessId },
        relations: ['classroom', 'user']
      });
      if (!access) {
        throw new NotFoundException('Requested access not found');
      }

      // Check if user is trying to change their own role
      if (access.user.id === user.user_id) {
        throw new BadRequestException('You are not allowed to change your own role');
      }

      // Check if current user has permission
      const currentUserAccess = await this.classroomAccessRepository.findOne({
        where: {
          classroom: { id: access.classroom.id },
          user: { id: user.user_id },
          status: 'accepted',
          role: In(['owner', 'teacher'])
        }
      });

      if (!currentUserAccess) {
        throw new BadRequestException('You do not have permission to change role');
      }

      // Update role
      await this.classroomAccessRepository.update(accessId, { role });

      // Publish event
      await this.pubSubService.publish('classroom.updated', {
        id: access.classroom.id,
      })

      await this.pubSubService.publish('classroom.member.updated', {
        id: access.classroom.id,
        data: {
          user_id: access.user.id,
          role: access.role,
        }
      })

      return {
        status: 'success',
        message: 'Role changed successfully'
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not change role');
    }
  }
} 