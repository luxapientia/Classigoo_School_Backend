import { Injectable, NotFoundException, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload } from '../../../common/decorators/user.decorator';
import { Message } from './schemas/message.schema';
import { MessageRoom } from './schemas/message-room.schema';
import { MessageRoomUser } from './schemas/message-room-user.schema';
import { Classroom } from '../core/schemas/classroom.schema';
import { ClassroomAccess } from '../core/schemas/classroom-access.schema';
import { User } from '../../auth/schemas/user.schema';
import { SendMessageDto } from './dto/send-message.dto';
import { StartChatDto } from './dto/start-chat.dto';
import { ListMessageRecipientsResponse } from './dto/list-message-recipients.dto';
import { MessageResponse } from './dto/get-room-messages.dto';
import { PubSubService } from '../../../shared/services/pubsub.service';
import { FileService } from '../../../shared/services/file.service';
import { DeleteFileDto } from './dto/delete-file.dto';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(MessageRoom)
    private messageRoomRepository: Repository<MessageRoom>,
    @InjectRepository(MessageRoomUser)
    private messageRoomUserRepository: Repository<MessageRoomUser>,
    @InjectRepository(Classroom)
    private classroomRepository: Repository<Classroom>,
    @InjectRepository(ClassroomAccess)
    private classroomAccessRepository: Repository<ClassroomAccess>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private pubsubService: PubSubService,
    private fileService: FileService,
  ) {}

  async sendMessage(sendMessageDto: SendMessageDto, user: JwtPayload): Promise<{ status: string; message: string }> {
    try {
      // Check if classroom exists
      const classroom = await this.classroomRepository.findOne({
        where: { id: sendMessageDto.class_id }
      });
      if (!classroom) {
        throw new NotFoundException('Classroom not found');
      }

      // Check if user is a member of the classroom
      const classroomMember = await this.classroomAccessRepository.findOne({
        where: {
          classroom: { id: sendMessageDto.class_id },
          user: { id: user.user_id },
          status: 'accepted'
        }
      });

      if (!classroomMember) {
        throw new UnauthorizedException('You are not a member of this classroom');
      }

      // Check if message room exists
      const messageRoom = await this.messageRoomRepository.findOne({
        where: { id: sendMessageDto.room_id }
      });
      if (!messageRoom) {
        throw new NotFoundException('Message room not found');
      }

      // Check if user is a member of the message room
      const roomMember = await this.messageRoomUserRepository.findOne({
        where: {
          room: { id: sendMessageDto.room_id },
          user: { id: user.user_id }
        }
      });

      if (messageRoom?.type === 'single' && !roomMember) {
        throw new UnauthorizedException('You are not a member of this chat room');
      }

      // Create message
      const message = this.messageRepository.create({
        room: { id: sendMessageDto.room_id },
        user: { id: user.user_id },
        content: sendMessageDto.message
      });
      await this.messageRepository.save(message);

      // publish event
      await this.pubsubService.publish('message.created', {
        id: sendMessageDto.room_id,
      });

      // Update room's active_at timestamp
      await this.messageRoomRepository.update(
        { id: sendMessageDto.room_id },
        { active_at: new Date() }
      );

      return {
        status: 'success',
        message: 'Message sent successfully'
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not send message');
    }
  }

  async deleteMessage(messageId: string, user: JwtPayload): Promise<{ status: string, message: string }> {
    try {
      const message = await this.messageRepository.findOne({
        where: { id: messageId },
        relations: ['user', 'room']
      });
      if (!message) {
        throw new NotFoundException('Message not found');
      }

      // Check if user owns the message
      if (message.user.id !== user.user_id) {
        throw new UnauthorizedException('You can only delete your own messages');
      }

      await this.messageRepository.remove(message);

      // publish event
      await this.pubsubService.publish('message.deleted', {
        id: messageId,
        room_id: message.room.id
      });

      return { status: "success", message: "Successfully delete the message" };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not delete message');
    }
  }

  async startChat(startChatDto: StartChatDto, user: JwtPayload): Promise<{ status: string; message: string; id: string }> {
    try {
      // Check if both users exist
      const [user1, user2] = await Promise.all([
        this.userRepository.findOne({ where: { id: user.user_id } }),
        this.userRepository.findOne({ where: { id: startChatDto.with_user } })
      ]);

      if (!user1 || !user2) {
        throw new NotFoundException('One or both users not found');
      }

      // Check if classroom exists
      const classroom = await this.classroomRepository.findOne({
        where: { id: startChatDto.classroom_id }
      });
      if (!classroom) {
        throw new NotFoundException('Classroom not found');
      }

      // Check if both users are members of the classroom
      const [user1Access, user2Access] = await Promise.all([
        this.classroomAccessRepository.findOne({
          where: {
            classroom: { id: startChatDto.classroom_id },
            user: { id: user.user_id },
            status: 'accepted'
          }
        }),
        this.classroomAccessRepository.findOne({
          where: {
            classroom: { id: startChatDto.classroom_id },
            user: { id: startChatDto.with_user },
            status: 'accepted'
          }
        })
      ]);

      if (!user1Access || !user2Access) {
        throw new UnauthorizedException('One or both users are not members of the classroom');
      }

      // Find if there's any room where both users are members using TypeORM relations
      const existingChat = await this.messageRoomRepository
        .createQueryBuilder('room')
        .innerJoin('room.users', 'user1')
        .innerJoin('room.users', 'user2')
        .where('user1.user_id = :userId1', { userId1: user.user_id })
        .andWhere('user2.user_id = :userId2', { userId2: startChatDto.with_user })
        .andWhere('room.type = :type', { type: 'single' })
        .andWhere('room.classroom_id = :classroomId', { classroomId: startChatDto.classroom_id })
        .getOne();

      if (existingChat) {
        throw new BadRequestException('Chat room already exists between these users');
      }

      // Create new chat room
      const newRoom = this.messageRoomRepository.create({
        name: `${user1.name} and ${user2.name}`,
        type: 'single',
        classroom: { id: startChatDto.classroom_id },
        active_at: new Date()
      });
      const savedRoom = await this.messageRoomRepository.save(newRoom);

      // Add both users to the room
      const roomUsers = [
        this.messageRoomUserRepository.create({
          room: { id: savedRoom.id },
          user: { id: user.user_id }
        }),
        this.messageRoomUserRepository.create({
          room: { id: savedRoom.id },
          user: { id: startChatDto.with_user }
        })
      ];
      await this.messageRoomUserRepository.save(roomUsers);

      return {
        status: 'success',
        message: 'Chat room created successfully',
        id: savedRoom.id
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not start chat');
    }
  }

  async listMessageRecipients(classroomId: string, user: JwtPayload): Promise<ListMessageRecipientsResponse[]> {
    try {
      const classroom = await this.classroomRepository.findOne({
        where: { id: classroomId }
      });
      if (!classroom) {
        throw new NotFoundException('Classroom not found');
      }

      // Check if user is a member of the classroom
      const userAccess = await this.classroomAccessRepository.findOne({
        where: {
          classroom: { id: classroomId },
          user: { id: user.user_id },
          status: 'accepted'
        }
      });

      if (!userAccess) {
        throw new UnauthorizedException('You are not a member of this classroom');
      }

      // Get all classroom members except the current user
      const recipients = await this.classroomAccessRepository
        .createQueryBuilder('access')
        .leftJoinAndSelect('access.user', 'user')
        .where('access.classroom_id = :classroomId', { classroomId })
        .andWhere('access.user_id != :userId', { userId: user.user_id })
        .andWhere('access.status = :status', { status: 'accepted' })
        .select([
          'user.id as id',
          'user.name as name',
          'user.email as email',
          'user.avatar as avatar'
        ])
        .getRawMany();

      return recipients as ListMessageRecipientsResponse[];
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not list message recipients');
    }
  }

  async getRoomMessages(roomId: string, limit: number, offset: number, user: JwtPayload): Promise<{ messages: MessageResponse[] }> {
    try {
      const room = await this.messageRoomRepository.findOne({
        where: { id: roomId },
        relations: ['users']
      });

      if (!room) {
        throw new NotFoundException('Message room not found');
      }

      // Check access for single type rooms
      if (room.type === 'single') {
        const hasAccess = room.users.some(ru => ru.user.id === user.user_id);
        if (!hasAccess) {
          throw new UnauthorizedException('You do not have access to this chat room');
        }
      }

      const messages = await this.messageRepository
        .createQueryBuilder('message')
        .leftJoinAndSelect('message.user', 'user')
        .where('message.room_id = :roomId', { roomId })
        .orderBy('message.created_at', 'DESC')
        .skip(offset)
        .take(limit)
        .select([
          'message.id',
          'message.content',
          'message.created_at',
          'message.updated_at',
          'user.id',
          'user.name',
          'user.email',
          'user.avatar'
        ])
        .getMany();

      const formattedMessages = messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        created_at: msg.created_at,
        updated_at: msg.updated_at,
        user: {
          id: msg.user.id,
          name: msg.user.name,
          email: msg.user.email,
          avatar: msg.user.avatar
        }
      }));

      return { messages: formattedMessages as MessageResponse[] };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not get room messages');
    }
  }

  async getRoomLatestMessage(roomId: string, user: JwtPayload): Promise<MessageResponse | null> {
    try {
      const room = await this.messageRoomRepository.findOne({
        where: { id: roomId },
        relations: ['users']
      });

      if (!room) {
        throw new NotFoundException('Message room not found');
      }

      // Check access for single type rooms
      if (room.type === 'single') {
        const hasAccess = room.users.some(ru => ru.user.id === user.user_id);
        if (!hasAccess) {
          throw new UnauthorizedException('You do not have access to this chat room');
        }
      }

      const latestMessage = await this.messageRepository
        .createQueryBuilder('message')
        .leftJoinAndSelect('message.user', 'user')
        .where('message.room_id = :roomId', { roomId })
        .orderBy('message.created_at', 'DESC')
        .select([
          'message.id',
          'message.content',
          'message.created_at',
          'message.updated_at',
          'user.id',
          'user.name',
          'user.email',
          'user.avatar'
        ])
        .getOne();

      if (!latestMessage) {
        return null;
      }

      return {
        id: latestMessage.id,
        content: latestMessage.content,
        created_at: latestMessage.created_at,
        updated_at: latestMessage.updated_at,
        user: {
          id: latestMessage.user.id,
          name: latestMessage.user.name,
          avatar: latestMessage.user.avatar
        }
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not get room latest message');
    }
  }

  async getRoomMessageIds(roomId: string, user: JwtPayload): Promise<{ id: string }[]> {
    try {
      const room = await this.messageRoomRepository.findOne({
        where: { id: roomId },
        relations: ['users']
      });

      if (!room) {
        throw new NotFoundException('Message room not found');
      }

      // Check access for single type rooms
      if (room.type === 'single') {
        const hasAccess = room.users.some(ru => ru.user.id === user.user_id);
        if (!hasAccess) {
          throw new UnauthorizedException('You do not have access to this chat room');
        }
      }

      const messages = await this.messageRepository
        .createQueryBuilder('message')
        .where('message.room_id = :roomId', { roomId })
        .select(['message.id'])
        .getMany();

      return messages.map(msg => ({ id: msg.id }));
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not get room message IDs');
    }
  }

  async deleteFile(deleteFileDto: DeleteFileDto, user: JwtPayload): Promise<{ status: string, message: string }> {
    try {
      const message = await this.messageRepository.findOne({
        where: { id: deleteFileDto.message_id },
        relations: ['user']
      });

      if (!message) {
        throw new NotFoundException('Message not found');
      }

      if (message.user.id !== user.user_id) {
        throw new UnauthorizedException('You can only delete your own files');
      }

      await this.fileService.deleteFile(deleteFileDto.files[0]);

      return {
        status: 'success',
        message: 'File deleted successfully'
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not delete file');
    }
  }
} 