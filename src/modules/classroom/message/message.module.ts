import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { Message } from './schemas/message.schema';
import { MessageRoom } from './schemas/message-room.schema';
import { MessageRoomUser } from './schemas/message-room-user.schema';
import { Classroom } from '../core/schemas/classroom.schema';
import { ClassroomAccess } from '../core/schemas/classroom-access.schema';
import { SharedModule } from '../../../shared/shared.module';

@Module({
  imports: [
    SharedModule,
    TypeOrmModule.forFeature([
      Message,
      MessageRoom,
      MessageRoomUser,
      Classroom,
      ClassroomAccess,
    ]),
  ],
  controllers: [MessageController],
  providers: [MessageService],
  exports: [MessageService],
})
export class MessageModule {} 