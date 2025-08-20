import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PubSubService } from '../../../shared/services/pubsub.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { JwtPayload } from '../../../common/decorators/user.decorator';
import { Classroom } from '../core/schemas/classroom.schema';
import { ClassroomAccess } from '../core/schemas/classroom-access.schema';
import { User } from '../../../modules/auth/schemas/user.schema';
import { Notification } from '../../notification/schemas/notification.schema';
import { VirtualStudent } from './schemas/virtual-student.schema';
import { InviteMemberDto, InviteMemberResponse } from './dto/invite-member.dto';
import { RemoveMemberDto, RemoveMemberResponse } from './dto/remove-member.dto';
import { ChangeRoleDto, ChangeRoleResponse } from './dto/change-role.dto';
import { CreateVirtualStudentDto, CreateVirtualStudentResponse } from './dto/create-virtual-student.dto';
import { ConnectParentDto, ConnectParentResponse } from './dto/connect-parent.dto';
import { RegenerateCodeDto, RegenerateCodeResponse } from './dto/regenerate-code.dto';
import { UpdateVirtualStudentDto, UpdateVirtualStudentResponse } from './dto/update-virtual-student.dto';
import { MailService } from '../../../common/utils/mail.service';
import { InvitationCodeUtil } from './utils/invitation-code.util';

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
    @InjectRepository(VirtualStudent)
    private virtualStudentRepository: Repository<VirtualStudent>,
    private readonly mailService: MailService,
    private readonly pubSubService: PubSubService,
    private readonly invitationCodeUtil: InvitationCodeUtil,
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
      const invitedUser = await this.userRepository.findOne({ where: { email, role } });
      if (!invitedUser) {
        throw new BadRequestException('The user does not exist');
      }

      // Check if user is already a member
      const existingAccess = await this.classroomAccessRepository.findOne({
        where: {
          classroom: { id: class_id },
          user: { id: invitedUser.id },
          status: 'accepted'
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
        user_id: invitedUser.id,
        image: currentUserData.avatar.url,
        content: `${currentUserData.name} invited you to join a classroom`,
        link: `/classroom/${class_id}/join?code=${classroom.invitation_code}`,
        is_read: false
      });

      // Publish event
      await this.pubSubService.publish('notification.updated', {
        target_id: invitedUser.id.toString(),
      })

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
      console.log(error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not invite member');
    }
  }

  async inviteParentToVirtualStudent(inviteParentDto: { class_id: string, virtual_student_id: string, email: string }, user: JwtPayload): Promise<any> {
    try {
      const { class_id, virtual_student_id, email } = inviteParentDto;

      // Check if classroom exists
      const classroom = await this.classroomRepository.findOne({ where: { id: class_id } });
      if (!classroom) {
        throw new NotFoundException('Classroom not found');
      }

      // Check if virtual student exists and belongs to this classroom
      const virtualStudent = await this.virtualStudentRepository.findOne({
        where: { id: virtual_student_id, classroom: { id: class_id } },
        relations: ['classroom']
      });
      if (!virtualStudent) {
        throw new NotFoundException('Virtual student not found');
      }

      // Check if virtual student is already connected
      if (virtualStudent.parent_connected) {
        throw new BadRequestException('This virtual student is already connected to a parent');
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
        throw new BadRequestException('You do not have permission to invite parents');
      }

      // Get current user details
      const currentUserData = await this.userRepository.findOne({ where: { id: user.user_id } });
      if (!currentUserData) {
        throw new BadRequestException('Current user not found');
      }

      // Find user by email
      const invitedUser = await this.userRepository.findOne({ where: { email, role: 'parent' } });
      if (!invitedUser) {
        throw new BadRequestException('Parent user not found with this email');
      }

      // Check if user is already a member of this classroom
      const existingAccess = await this.classroomAccessRepository.findOne({
        where: {
          classroom: { id: class_id },
          user: { id: invitedUser.id },
          status: 'accepted'
        }
      });

      // If not a member, add them to classroom with pending status
      if (!existingAccess) {
        await this.classroomAccessRepository.save({
          classroom: { id: class_id },
          user: { id: invitedUser.id },
          role: 'parent',
          status: 'pending'
        });
      }

      // Connect parent to virtual student
      // await this.virtualStudentRepository.update(virtual_student_id, {
      //   parent: { id: invitedUser.id },
      //   parent_connected: true
      // });

      // Create notification
      await this.notificationRepository.save({
        user_id: invitedUser.id,
        image: currentUserData.avatar.url,
        content: `${currentUserData.name} invited you to connect to ${virtualStudent.name} in their classroom`,
        link: `/classroom/${class_id}/join?student=${virtualStudent.id}&code=${virtualStudent.invitation_code}`,
        is_read: false
      });

      // Publish events
      await this.pubSubService.publish('classroom.updated', {
        id: class_id,
      });

      await this.pubSubService.publish('notification.updated', {
        target_id: invitedUser.id.toString(),
      });

      // Send invitation email with direct connection
      const connectionLink = `${process.env.FRONTEND_URL}/classroom/${class_id}/join?student=${virtualStudent.id}&code=${virtualStudent.invitation_code}`;
      
      await this.mailService.sendMail({
        to: invitedUser.email,
        subject: `You've been invited to connect to ${virtualStudent.name} in ${classroom.name}`,
        text: `Hello ${invitedUser.name},\n\n` +
              `${currentUserData.name} has invited you to connect to ${virtualStudent.name} in their classroom "${classroom.name}".\n\n` +
              `Click the link below to accept the invitation and connect to ${virtualStudent.name}:\n` +
              `${connectionLink}\n\n` +
              `Once you click the link, you'll be automatically connected and can access the classroom immediately.\n\n` +
              `You can also access your children list from your dashboard after accepting.\n\n` +
              `Best regards,\nThe Classigoo Team`
      });

      return {
        status: 'success',
        message: 'Parent successfully invited and connected to virtual student',
        data: {
          virtual_student_id: virtualStudent.id,
          student_name: virtualStudent.name,
          parent_email: email,
          classroom_name: classroom.name
        }
      };
    } catch (error) {
      console.error('Invite Parent to Virtual Student Error:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not invite parent to virtual student');
    }
  }

  async removeParentFromVirtualStudent(removeParentDto: { virtual_student_id: string }, user: JwtPayload): Promise<any> {
    try {
      const { virtual_student_id } = removeParentDto;

      // Check if virtual student exists
      const virtualStudent = await this.virtualStudentRepository.findOne({
        where: { id: virtual_student_id },
        relations: ['classroom', 'parent']
      });
      if (!virtualStudent) {
        throw new NotFoundException('Virtual student not found');
      }

      // Check if current user has permission
      const currentUserAccess = await this.classroomAccessRepository.findOne({
        where: {
          classroom: { id: virtualStudent.classroom.id },
          user: { id: user.user_id },
          status: 'accepted',
          role: In(['owner', 'teacher'])
        }
      });

      if (!currentUserAccess) {
        throw new BadRequestException('You do not have permission to remove parents');
      }

      if (!virtualStudent.parent_connected) {
        throw new BadRequestException('No parent is connected to this virtual student');
      }

      // Disconnect parent from virtual student
      await this.virtualStudentRepository.update(virtual_student_id, {
        parent_connected: false
      });
      
      // Remove parent relation separately to avoid TypeORM null assignment issue
      await this.virtualStudentRepository
        .createQueryBuilder()
        .update(VirtualStudent)
        .set({ parent: () => 'NULL' })
        .where('id = :id', { id: virtual_student_id })
        .execute();

      // Generate new invitation code
      const newCode = await this.invitationCodeUtil.generateUniqueCode();
      await this.virtualStudentRepository.update(virtual_student_id, {
        invitation_code: newCode
      });

      // Publish events
      await this.pubSubService.publish('classroom.updated', {
        id: virtualStudent.classroom.id,
      });

      return {
        status: 'success',
        message: 'Parent removed successfully',
        data: {
          virtual_student_id: virtualStudent.id,
          new_invitation_code: newCode
        }
      };
    } catch (error) {
      console.error('Remove Parent Error:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not remove parent from virtual student');
    }
  }

  async acceptInvitationFromEmail(acceptDto: { class_id: string, student_id?: string }, user: JwtPayload): Promise<any> {
    try {
      const { class_id, student_id } = acceptDto;

      // Update classroom access status to accepted
      const access = await this.classroomAccessRepository.findOne({
        where: {
          classroom: { id: class_id },
          user: { id: user.user_id },
          status: 'pending'
        }
      });

      if (access) {
        await this.classroomAccessRepository.update(access.id, {
          status: 'accepted'
        });
      }

      // If student_id is provided, ensure parent is connected to that student
      if (student_id) {
        const virtualStudent = await this.virtualStudentRepository.findOne({
          where: { id: student_id, classroom: { id: class_id } }
        });

        if (virtualStudent && !virtualStudent.parent_connected) {
          await this.virtualStudentRepository.update(student_id, {
            parent: { id: user.user_id },
            parent_connected: true
          });
        }
      }

      // Publish events
      await this.pubSubService.publish('classroom.updated', {
        id: class_id,
      });

      return {
        status: 'success',
        message: 'Invitation accepted successfully',
        data: {
          classroom_id: class_id,
          student_id: student_id
        }
      };
    } catch (error) {
      console.error('Accept Invitation Error:', error);
      throw new InternalServerErrorException('Could not accept invitation');
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

      // Get current user details
      const currentUserData = await this.userRepository.findOne({ where: { id: user.user_id } });
      if (!currentUserData) {
        throw new BadRequestException('Current user not found');
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

      // Create notification
      await this.notificationRepository.save({
        user: { id: access.user.id },
        image: currentUserData.avatar.url,
        content: `${currentUserData.name} removed you from a classroom`,
        link: `/classrooms`,
        is_read: false
      });

      // Publish event
      await this.pubSubService.publish('notification.updated', {
        target_id: access.user.id.toString(),
      })

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

      // Get current user details
      const currentUserData = await this.userRepository.findOne({ where: { id: user.user_id } });
      if (!currentUserData) {
        throw new BadRequestException('Current user not found');
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

      // Create notification

      await this.notificationRepository.save({
        user: { id: access.user.id },
        image: currentUserData.avatar.url,
        content: `${currentUserData.name} changed your role to ${role}`,
        link: `/classroom/${access.classroom.id}/members`,
        is_read: false
      });

      // Publish event
      await this.pubSubService.publish('notification.updated', {
        target_id: access.user.id.toString(),
      })

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

  // ==================== VIRTUAL STUDENT METHODS ====================

  async createVirtualStudent(createVirtualStudentDto: CreateVirtualStudentDto, user: JwtPayload): Promise<CreateVirtualStudentResponse> {
    try {
      const { name, profile_picture, classroom_id } = createVirtualStudentDto;

      // Check if classroom exists
      const classroom = await this.classroomRepository.findOne({ where: { id: classroom_id } });
      if (!classroom) {
        throw new NotFoundException('Classroom not found');
      }

      // Check if current user has permission
      const currentUserAccess = await this.classroomAccessRepository.findOne({
        where: {
          classroom: { id: classroom_id },
          user: { id: user.user_id },
          status: 'accepted',
          role: In(['owner', 'teacher'])
        }
      });

      if (!currentUserAccess) {
        throw new BadRequestException('You do not have permission to create virtual students');
      }

      // Generate unique invitation code
      const invitationCode = await this.invitationCodeUtil.generateUniqueCode();

      // Create virtual student
      const virtualStudent = await this.virtualStudentRepository.save({
        name,
        profile_picture,
        classroom: { id: classroom_id },
        created_by: { id: user.user_id },
        invitation_code: invitationCode,
        parent_connected: false
      });

      // Publish event
      await this.pubSubService.publish('classroom.updated', {
        id: classroom_id,
      });

      return {
        status: 'success',
        message: 'Virtual student created successfully',
        data: {
          id: virtualStudent.id,
          name: virtualStudent.name,
          invitation_code: virtualStudent.invitation_code,
          profile_picture: virtualStudent.profile_picture
        }
      };
    } catch (error) {
      console.error('Create Virtual Student Error:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not create virtual student');
    }
  }

  async updateVirtualStudent(updateVirtualStudentDto: UpdateVirtualStudentDto, user: JwtPayload): Promise<UpdateVirtualStudentResponse> {
    try {
      const { virtual_student_id, name, profile_picture } = updateVirtualStudentDto;

      // Get virtual student
      const virtualStudent = await this.virtualStudentRepository.findOne({
        where: { id: virtual_student_id },
        relations: ['classroom']
      });

      if (!virtualStudent) {
        throw new NotFoundException('Virtual student not found');
      }

      // Check if current user has permission
      const currentUserAccess = await this.classroomAccessRepository.findOne({
        where: {
          classroom: { id: virtualStudent.classroom.id },
          user: { id: user.user_id },
          status: 'accepted',
          role: In(['owner', 'teacher'])
        }
      });

      if (!currentUserAccess) {
        throw new BadRequestException('You do not have permission to update this virtual student');
      }

      // Update virtual student
      await this.virtualStudentRepository.update(virtual_student_id, {
        name: name || virtualStudent.name,
        profile_picture: profile_picture || virtualStudent.profile_picture
      });

      // Publish event
      await this.pubSubService.publish('classroom.updated', {
        id: virtualStudent.classroom.id,
      });

      return {
        status: 'success',
        message: 'Virtual student updated successfully',
        data: {
          id: virtual_student_id,
          name: name || virtualStudent.name,
          profile_picture: profile_picture || virtualStudent.profile_picture
        }
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not update virtual student');
    }
  }

  async connectParent(connectParentDto: ConnectParentDto, user: JwtPayload): Promise<ConnectParentResponse> {
    try {
      const { invitation_code } = connectParentDto;

      // Validate invitation code
      const codeValidation = await this.invitationCodeUtil.validateCode(invitation_code);
      
      if (!codeValidation.exists) {
        throw new NotFoundException('Invalid invitation code');
      }

      if (!codeValidation.available) {
        throw new BadRequestException('This invitation code is already in use');
      }

      const virtualStudent = codeValidation.student;
      if (!virtualStudent) {
        throw new NotFoundException('Virtual student not found');
      }

      // Check if user is a parent
      if (user.role !== 'parent') {
        throw new BadRequestException('Only parents can connect to virtual students');
      }

      // Add parent as a member of the classroom
      const parentAccess = await this.classroomAccessRepository.findOne({
        where: {
          classroom: { id: virtualStudent.classroom.id },
          user: { id: user.user_id }
        }
      });

      if (!parentAccess) {
        await this.classroomAccessRepository.save({
          classroom: { id: virtualStudent.classroom.id },
          user: { id: user.user_id },
          status: 'accepted'
        });
      } else {
        await this.classroomAccessRepository.update(parentAccess.id, {
          status: 'accepted'
        });
      }

      // Check if parent is already connected to this student
      if (virtualStudent.parent && virtualStudent.parent.id === user.user_id) {
        throw new BadRequestException('You are already connected to this virtual student');
      }

      // Connect parent to virtual student
      await this.virtualStudentRepository.update(virtualStudent.id, {
        parent: { id: user.user_id },
        parent_connected: true
      });

      // Publish event
      await this.pubSubService.publish('classroom.updated', {
        id: virtualStudent.classroom.id,
      });

      return {
        status: 'success',
        message: 'Successfully connected to virtual student',
        data: {
          virtual_student_id: virtualStudent.id,
          student_name: virtualStudent.name,
          classroom_id: virtualStudent.classroom.id,
          classroom_name: virtualStudent.classroom.name
        }
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not connect parent to virtual student');
    }
  }

  async regenerateCode(regenerateCodeDto: RegenerateCodeDto, user: JwtPayload): Promise<RegenerateCodeResponse> {
    try {
      const { virtual_student_id } = regenerateCodeDto;

      // Get virtual student
      const virtualStudent = await this.virtualStudentRepository.findOne({
        where: { id: virtual_student_id },
        relations: ['classroom', 'parent']
      });

      if (!virtualStudent) {
        throw new NotFoundException('Virtual student not found');
      }

      // Check if current user has permission
      const currentUserAccess = await this.classroomAccessRepository.findOne({
        where: {
          classroom: { id: virtualStudent.classroom.id },
          user: { id: user.user_id },
          status: 'accepted',
          role: In(['owner', 'teacher'])
        }
      });

      if (!currentUserAccess) {
        throw new BadRequestException('You do not have permission to regenerate code for this virtual student');
      }

      // Check if parent is already connected
      if (virtualStudent.parent_connected) {
        throw new BadRequestException('Cannot regenerate code for a connected virtual student');
      }

      // Generate new invitation code
      const newCode = await this.invitationCodeUtil.generateUniqueCode();

      // Update virtual student with new code
      await this.virtualStudentRepository.update(virtual_student_id, {
        invitation_code: newCode
      });

      // Publish event
      await this.pubSubService.publish('classroom.updated', {
        id: virtualStudent.classroom.id,
      });

      return {
        status: 'success',
        message: 'Invitation code regenerated successfully',
        data: {
          invitation_code: newCode
        }
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not regenerate invitation code');
    }
  }

  async getVirtualStudentsByClassroom(classroomId: string, user: JwtPayload): Promise<any> {
    try {
      // Check if user has access to classroom
      const userAccess = await this.classroomAccessRepository.findOne({
        where: {
          classroom: { id: classroomId },
          user: { id: user.user_id },
          status: 'accepted'
        }
      });

      if (!userAccess) {
        throw new BadRequestException('You do not have access to this classroom');
      }

      // Get virtual students for classroom
      const virtualStudents = await this.virtualStudentRepository.find({
        where: { classroom: { id: classroomId } },
        relations: ['parent', 'created_by'],
        order: { created_at: 'ASC' }
      });

      return {
        status: 'success',
        message: 'Virtual students retrieved successfully',
        data: virtualStudents
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not retrieve virtual students');
    }
  }

  async getVirtualStudentsByParent(parentId: string, user: JwtPayload): Promise<any> {
    try {
      // Check if user is requesting their own data or has permission
      if (user.user_id !== parentId && user.role !== 'teacher' && user.role !== 'owner') {
        throw new BadRequestException('You do not have permission to view this data');
      }

      // Get virtual students connected to parent
      const virtualStudents = await this.virtualStudentRepository.find({
        where: { parent: { id: parentId }, parent_connected: true },
        relations: ['classroom', 'created_by'],
        order: { created_at: 'ASC' }
      });

      return {
        status: 'success',
        message: 'Virtual students retrieved successfully',
        data: virtualStudents
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not retrieve virtual students');
    }
  }
} 