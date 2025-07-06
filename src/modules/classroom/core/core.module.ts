import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoreController } from './core.controller';
import { CoreService } from './core.service';
import { Classroom } from './schemas/classroom.schema';
import { ClassroomAccess } from './schemas/classroom-access.schema';
import { MessageRoom } from '../message/schemas/message-room.schema';
import { Message } from '../message/schemas/message.schema';
import { ClassroomPost } from '../post/schemas/classroom-post.schema';
import { Exam } from '../exam/schemas/exam.schema';
import { Assignment } from '../assignment/schemas/assignment.schema';
import { SharedModule } from '../../../shared/shared.module';

@Module({
  imports: [
    SharedModule,
    TypeOrmModule.forFeature([
      Classroom,
      ClassroomAccess,
      MessageRoom,
      Message,
      ClassroomPost,
      Exam,
      Assignment,
    ]),
  ],
  controllers: [CoreController],
  providers: [CoreService],
  exports: [CoreService],
})
export class CoreModule {} 