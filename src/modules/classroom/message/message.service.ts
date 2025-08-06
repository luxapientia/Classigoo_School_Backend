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

      // Check for existing chat room
      const existingChat = await this.messageRoomRepository
        .createQueryBuilder('room')
        .innerJoin('room.users', 'user1')
        .innerJoin('room.users', 'user2')
        .where('room.type = :type', { type: 'single' })
        .andWhere('room.classroom = :classroomId', { classroomId: startChatDto.classroom_id })
        .andWhere('user1.user = :userId1', { userId1: user.user_id })
        .andWhere('user2.user = :userId2', { userId2: startChatDto.with_user })
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

      // Add initial system message
      const systemMessage = this.messageRepository.create({
        room: { id: savedRoom.id },
        user: { id: user.user_id },
        content: { type: 'system', text: 'Chat initiated' }
      });
      await this.messageRepository.save(systemMessage);

      // publish event
      await this.pubsubService.publish('chatroom.created', {
        class_id: startChatDto.classroom_id,
        room_id: savedRoom.id,
      });

      return {
        status: 'success',
        message: 'Chat room created successfully',
        id: savedRoom.id
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException || error instanceof BadRequestException) {
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

      // First get all message rooms in the classroom
      const allRooms = await this.messageRoomRepository
        .createQueryBuilder('room')
        .leftJoinAndSelect('room.users', 'roomUser')
        .leftJoinAndSelect('roomUser.user', 'user')
        .leftJoinAndSelect('user.classroomAccesses', 'access', 'access.classroom = :classroomId', { classroomId })
        .where('room.classroom = :classroomId', { classroomId })
        .getMany();

      // Filter rooms based on type and user membership
      const filteredRooms = allRooms.filter(room => {
        if (room.type === 'all') {
          return true; // Include all type rooms without checking membership
        }
        // For single type rooms, check if user is a member
        return room.users.some(ru => ru.user.id === user.user_id);
      });

      // Format response to match expected type
      const formattedRooms: ListMessageRecipientsResponse[] = filteredRooms.map(room => ({
        id: room.id,
        name: room.name,
        type: room.type,
        users: room.users.map(ru => ({
          id: ru.id,
          user: {
            id: ru.user.id,
            name: ru.user.name,
            email: ru.user.email,
            avatar: ru.user.avatar,
            role: ru.user.classroomAccesses[0]?.role
          }
        }))
      }));

      // Sort by updated_at in descending order
      formattedRooms.sort((a, b) => {
        const roomA = allRooms.find(r => r.id === a.id);
        const roomB = allRooms.find(r => r.id === b.id);
        if (!roomA || !roomB) return 0;
        return roomB.updated_at.getTime() - roomA.updated_at.getTime();
      });

      return formattedRooms;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not list message recipients');
    }
  }

  async getRoomMessages(roomId: string, limit: number, offset: number, user: JwtPayload): Promise<{ messages: MessageResponse[] }> {
    try {
      // Check if room exists and user is a member
      const room = await this.messageRoomRepository
        .createQueryBuilder('room')
        .leftJoinAndSelect('room.users', 'roomUser')
        .where('room.id = :roomId', { roomId })
        .getOne();

      if (!room) {
        throw new NotFoundException('Message room not found');
      }

      if (room.type === 'single') {
        const isMember = room.users.some(ru => ru.user.id === user.user_id);
        if (!isMember) {
          throw new UnauthorizedException('You are not a member of this chat room');
        }
      }

      // Get messages with user data
      const messages = await this.messageRepository
        .createQueryBuilder('message')
        .leftJoinAndSelect('message.user', 'user')
        .where('message.room = :roomId', { roomId })
        .select([
          'message.id as id',
          'message.content as content',
          'message.created_at as created_at',
          'message.updated_at as updated_at',
          'user.id as user_id',
          'user.name as user_name',
          'user.avatar as user_avatar'
        ])
        .orderBy('message.created_at', 'DESC')
        .offset(offset)
        .limit(limit)
        .getRawMany();

      // Format messages to match expected type
      const formattedMessages: MessageResponse[] = messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        created_at: msg.created_at,
        updated_at: msg.updated_at,
        user: {
          id: msg.user_id,
          name: msg.user_name,
          avatar: msg.user_avatar
        }
      }));

      return { messages: formattedMessages };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not get room messages');
    }
  }

  async getRoomLatestMessage(roomId: string, user: JwtPayload): Promise<MessageResponse | null> {
    try {
      // Check if room exists and user is a member
      const room = await this.messageRoomRepository
        .createQueryBuilder('room')
        .leftJoinAndSelect('room.users', 'roomUser')
        .where('room.id = :roomId', { roomId })
        .getOne();

      if (!room) {
        throw new NotFoundException('Message room not found');
      }

      if (room.type === 'single') {
        const isMember = room.users.some(ru => ru.user.id === user.user_id);
        if (!isMember) {
          throw new UnauthorizedException('You are not a member of this chat room');
        }
      }

      // Get latest message with user data
      const message = await this.messageRepository
        .createQueryBuilder('message')
        .leftJoinAndSelect('message.user', 'user')
        .where('message.room = :roomId', { roomId })
        .select([
          'message.id as id',
          'message.content as content',
          'message.created_at as created_at',
          'message.updated_at as updated_at',
          'user.id as user_id',
          'user.name as user_name',
          'user.avatar as user_avatar'
        ])
        .orderBy('message.created_at', 'DESC')
        .limit(1)
        .getRawOne();

      if (!message) {
        return null;
      }

      // Format message to match expected type
      return {
        id: message.id,
        content: message.content,
        created_at: message.created_at,
        updated_at: message.updated_at,
        user: {
          id: message.user_id,
          name: message.user_name,
          avatar: message.user_avatar
        }
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not get latest room message');
    }
  }

  async getRoomMessageIds(roomId: string, user: JwtPayload): Promise<{ id: string }[]> {
    try {
      // Check if room exists and user is a member
      const room = await this.messageRoomRepository
        .createQueryBuilder('room')
        .leftJoinAndSelect('room.users', 'roomUser')
        .where('room.id = :roomId', { roomId })
        .getOne();

      if (!room) {
        throw new NotFoundException('Message room not found');
      }

      if (room.type === 'single') {
        const isMember = room.users.some(ru => ru.user.id === user.user_id);
        if (!isMember) {
          throw new UnauthorizedException('You are not a member of this chat room');
        }
      }

      // Get message IDs
      const messages = await this.messageRepository
        .createQueryBuilder('message')
        .where('message.room = :roomId', { roomId })
        .select(['message.id as id'])
        .getRawMany();

      return messages as { id: string }[];
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