import { Injectable, NotFoundException, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { PubSubService } from '../../../shared/services/pubsub.service';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { JwtPayload } from '../../../common/decorators/user.decorator';
import { Classroom } from './schemas/classroom.schema';
import { ClassroomAccess } from './schemas/classroom-access.schema';
import { MessageRoom } from '../message/schemas/message-room.schema';
import { Message } from '../message/schemas/message.schema';
import { ClassroomPost } from '../post/schemas/classroom-post.schema';
import { Exam } from '../exam/schemas/exam.schema';
import { Assignment } from '../assignment/schemas/assignment.schema';
import { CreateClassroomDto, CreateClassroomResponse } from './dto/create-classroom.dto';
import { JoinClassroomDto, JoinClassroomResponse } from './dto/join-classroom.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';
import { ToggleInvitationDto } from './dto/toggle-invitation.dto';
import * as randomstring from 'randomstring';

@Injectable()
export class CoreService {
  constructor(
    @InjectRepository(Classroom) private classroomRepo: Repository<Classroom>,
    @InjectRepository(ClassroomAccess) private classroomAccessRepo: Repository<ClassroomAccess>,
    @InjectRepository(Message) private messageRepo: Repository<Message>,
    @InjectRepository(MessageRoom) private messageRoomRepo: Repository<MessageRoom>,
    @InjectRepository(ClassroomPost) private classroomPostRepo: Repository<ClassroomPost>,
    @InjectRepository(Exam) private examRepo: Repository<Exam>,
    @InjectRepository(Assignment) private assignmentRepo: Repository<Assignment>,
    private pubSubService: PubSubService,
    private configService: ConfigService,
  ) {}

  async createClassroom(
    createClassroomDto: CreateClassroomDto,
    user: JwtPayload
  ): Promise<CreateClassroomResponse> {
    try {
      // Generate invitation code
      const invitationCode = randomstring.generate({
        length: 7,
        charset: 'alphanumeric'
      });

      // Generate random cover image number (1-10)
      const randomInt = Math.floor(Math.random() * (10 - 1 + 1)) + 1;
      const coverImg = `${this.configService.get('env.aws.s3.staticCdnUrl')}/content/cover/${randomInt}.jpeg`;

      // Create classroom
      const createdClassroom = await this.classroomRepo.save({
        ...createClassroomDto,
        owner: { id: user.user_id },
        invitation_code: invitationCode,
        cover_img: coverImg
      });

      // Create classroom access for owner
      await this.classroomAccessRepo.save({
        classroom: { id: createdClassroom.id },
        user: { id: user.user_id },
        role: 'owner',
        status: 'accepted'
      });

      // Create group chat room
      const groupChat = await this.messageRoomRepo.save({
        name: 'Classroom Group',
        type: 'all',
        classroom: { id: createdClassroom.id },
        active_at: new Date()
      });

      // Add initial system message
      await this.messageRepo.save({
        room: { id: groupChat.id },
        user: { id: user.user_id },
        content: { type: 'system', text: 'Group Created' }
      });

      await this.pubSubService.publish('classroom.updated', {
        id: createdClassroom.id,
        data: createdClassroom
      });

      return {
        id: createdClassroom.id,
        message: 'Classroom created successfully',
        status: 'success'
      };
    } catch (error) {
      console.error('Create Classroom Error:', error);
      throw new InternalServerErrorException('Could not create classroom');
    }
  }

  async join(joinClassroomDto: JoinClassroomDto, user: JwtPayload): Promise<JoinClassroomResponse> {
    try {
      // Find classroom by invitation code
      const targetClassroom = await this.classroomRepo.findOne({ where: { id: joinClassroomDto.class_id } });

      if (!targetClassroom) {
        throw new NotFoundException('Classroom not found with provided invitation code');
      }

      // Check if user already has access
      const existingAccess = await this.classroomAccessRepo.findOne({
        where: {
          classroom: { id: targetClassroom.id },
          user: { id: user.user_id }
        }
      });

      if (existingAccess) {
        if (existingAccess.status === 'accepted') {
          return {
            id: joinClassroomDto.class_id,
            message: 'You are already a member of this classroom',
            status: 'error'
          };
        } else if (existingAccess.status === 'pending') {
          // Update pending access to accepted
          await this.classroomAccessRepo.update(
            { id: existingAccess.id },
            { status: 'accepted' }
          );
        }
      } else {
        // Create new access
        await this.classroomAccessRepo.save({
          classroom: { id: joinClassroomDto.class_id },
          user: { id: user.user_id },
          role: 'student',
          status: 'accepted'
        });
      }

      // Publish event
      await this.pubSubService.publish('classroom.updated', {
        id: joinClassroomDto.class_id,
      });

      await this.pubSubService.publish('classroom.member.updated', {
        id: joinClassroomDto.class_id,
        data: {
          user_id: user.user_id,
          role: 'student',
        }
      });

      return {
        id: joinClassroomDto.class_id,
        message: 'Successfully joined classroom',
        status: 'success'
      };
    } catch (error) {
      console.error('Join Classroom Error:', error);
      throw new InternalServerErrorException('Could not join classroom');
    }
  }

  async updateClassroom(updateClassroomDto: UpdateClassroomDto, user: JwtPayload): Promise<Classroom> {
    try {
      const classroom = await this.classroomRepo.findOne({ where: { id: updateClassroomDto.id } });
      if (!classroom) {
        throw new NotFoundException('Classroom not found');
      }

      // Check if user has permission to update this classroom
      const access = await this.classroomAccessRepo.findOne({
        where: {
          classroom: { id: updateClassroomDto.id },
          user: { id: user.user_id },
          status: 'accepted',
          role: In(['owner', 'teacher'])
        }
      });

      if (!access) {
        throw new UnauthorizedException('You do not have permission to update this classroom');
      }

      const { id, ...updateData } = updateClassroomDto;
      const updatedClassroom = await this.classroomRepo.save({
        ...classroom,
        ...updateData
      });
      
      if (!updatedClassroom) {
        throw new InternalServerErrorException('Failed to update classroom');
      }

      // Load owner relation
      const classroomWithOwner = await this.classroomRepo.findOneOrFail({
        where: { id: updatedClassroom.id },
        relations: ['owner']
      });

      await this.pubSubService.publish('classroom.updated', {
        id: updatedClassroom.id,
        classroom: classroomWithOwner
      });
      
      return classroomWithOwner;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not update classroom');
    }
  }

  async getAllClassrooms(user: JwtPayload): Promise<any> {
    try {
      const result = await this.classroomAccessRepo.find({
        where: {
          user: { id: user.user_id },
          status: 'accepted'
        },
        relations: ['classroom']
      });

      return result.map(access => ({
        _id: access.classroom.id,
        name: access.classroom.name,
        owner: access.classroom.owner,
        room: access.classroom.room,
        section: access.classroom.section,
        subject: access.classroom.subject,
        invitation_code: access.classroom.invitation_code,
        cover_img: access.classroom.cover_img,
        ownerDetails: {
          avatar: access.user.avatar,
          name: access.user.name
        }
      }));
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not fetch classrooms');
    }
  }

  async getClassroom(id: string, user: JwtPayload): Promise<any> {
    try {
      // Check if user has permission to view this classroom
      const access = await this.classroomAccessRepo.findOne({
        where: {
          classroom: { id },
          user: { id: user.user_id },
          status: 'accepted'
        }
      });

      if (!access) {
        throw new UnauthorizedException('You do not have permission to view this classroom');
      }

      const result = await this.classroomRepo.findOne({
        where: { id },
        relations: [
          'owner',
          'classroom_relation',
          'classroom_relation.user'
        ],
        select: {
          id: true,
          name: true,
          section: true,
          subject: true,
          room: true,
          child_only: true,
          invitation_code: true,
          cover_img: true,
          owner: {
            id: true,
            name: true,
            avatar: true
          },
          classroom_relation: {
            id: true,
            role: true,
            status: true,
            user: {
              id: true,
              avatar: true,
              name: true,
              email: true,
              is_plus: true
            }
          }
        }
      });

      if (!result) {
        throw new NotFoundException('Classroom not found');
      }

      // Transform the result to match the GraphQL structure
      const transformedResult: any = {
        ...result,
        ownerDetails: result.owner,
        classroom_relation: result.classroom_relation
      };
      delete transformedResult.owner;

      return transformedResult;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not get classroom details');
    }
  }

  async deleteClassroom(id: string, user: JwtPayload): Promise<{ status: string, message: string }> {
    try {
      const classroom = await this.classroomRepo.findOne({ where: { id: id } });
      if (!classroom) {
        throw new NotFoundException('Classroom not found');
      }

      // Check if user is the owner
      const access = await this.classroomAccessRepo.findOne({
        where: {
          classroom: { id: id },
          user: { id: user.user_id },
          status: 'accepted',
          role: 'owner'
        }
      });

      if (!access) {
        throw new UnauthorizedException('You do not have permission to delete this classroom');
      }

      // Delete all related data
      await Promise.all([
        this.classroomAccessRepo.delete({ classroom: { id } }),
        this.classroomPostRepo.delete({ classroom: { id } }),
        this.messageRoomRepo.delete({ classroom: { id } }),
        this.examRepo.delete({ classroom: { id } }),
        this.assignmentRepo.delete({ classroom: { id } })
      ]);

      // Delete the classroom
      const result = await this.classroomRepo.delete(id);
      if (!result) {
        throw new InternalServerErrorException('Failed to delete classroom');
      }

      await this.pubSubService.publish('classroom.deleted', {
        id: id
      });

      return {
        status: 'success',
        message: 'Classroom deleted successfully'
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not delete classroom');
    }
  }

  async enableInvitation(input: ToggleInvitationDto, user: JwtPayload): Promise<{ status: string; message: string }> {
    try {
      const classroom = await this.classroomRepo.findOne({ where: { id: input.classroom_id } });
      if (!classroom) {
        throw new NotFoundException('Classroom not found');
      }

      // Check if user has permission
      const access = await this.classroomAccessRepo.findOne({
        where: {
          classroom: { id: input.classroom_id },
          user: { id: user.user_id },
          status: 'accepted',
          role: In(['owner', 'teacher'])
        }
      });

      if (!access) {
        throw new UnauthorizedException('You do not have permission to manage invitations');
      }

      // Generate new invitation code
      const code = randomstring.generate({
        length: 7,
        charset: 'alphanumeric'
      });

      // Update classroom with new code
      await this.classroomRepo.update(input.classroom_id, {
        invitation_code: code
      });

      await this.pubSubService.publish('classroom.updated', {
        id: input.classroom_id
      });

      return {
        status: 'success',
        message: 'Invitation code enabled successfully'
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not enable invitation');
    }
  }

  async disableInvitation(input: ToggleInvitationDto, user: JwtPayload): Promise<{ status: string; message: string }> {
    try {
      const classroom = await this.classroomRepo.findOne({ where: { id: input.classroom_id } });
      if (!classroom) {
        throw new NotFoundException('Classroom not found');
      }

      // Check if user has permission
      const access = await this.classroomAccessRepo.findOne({
        where: {
          classroom: { id: input.classroom_id },
          user: { id: user.user_id },
          status: 'accepted',
          role: In(['owner', 'teacher'])
        }
      });

      if (!access) {
        throw new UnauthorizedException('You do not have permission to manage invitations');
      }

      // Disable invitation code and remove pending access requests
      await Promise.all([
        this.classroomRepo.update(input.classroom_id, {
          invitation_code: ''
        }),
        this.classroomAccessRepo.delete({
          classroom: { id: input.classroom_id },
          status: 'pending'
        })
      ]);

      await this.pubSubService.publish('classroom.updated', {
        id: input.classroom_id
      });

      return {
        status: 'success',
        message: 'Invitation code disabled successfully'
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not disable invitation');
    }
  }

  async getClassroomAccess(input: { cid: string; uid: string }, user: JwtPayload): Promise<{ status: string; data: any }> {
    try {
      // Verify the user has permission to view this access info
      if (user.user_id !== input.uid) {
        throw new UnauthorizedException('You can only view your own access information');
      }

      const access = await this.classroomAccessRepo.findOne({
        where: {
          classroom: { id: input.cid },
          user: { id: input.uid }
        }
      });

      return {
        data: access,
        status: 'success'
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not get classroom access information');
    }
  }

  async getClassroomNames(uid: string, user: JwtPayload): Promise<any> {
    try {
      if (user.user_id !== uid) {
        throw new UnauthorizedException('You are not authorized to access this resource');
      }

      const results = await this.classroomAccessRepo.find({
        where: {
          user: { id: uid },
          status: 'accepted',
          role: In(['owner', 'teacher'])
        },
        relations: ['classroom']
      });

      return {
        status: 'success',
        message: 'Classroom names retrieved successfully',
        data: results.map(access => ({
          id: access.id,
          classroom: {
            id: access.classroom.id,
            name: access.classroom.name
          }
        }))
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not retrieve classroom names');
    }
  }
} 