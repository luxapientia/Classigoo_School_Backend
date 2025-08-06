import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { ClassroomPost } from './schemas/classroom-post.schema';
import { ClassroomPostComment } from './schemas/classroom-post-comment.schema';
import { Classroom } from '../core/schemas/classroom.schema';
import { ClassroomAccess } from '../core/schemas/classroom-access.schema';
import { Notification } from '../../notification/schemas/notification.schema';
import { SharedModule } from '../../../shared/shared.module';

@Module({
  imports: [
    SharedModule,
    TypeOrmModule.forFeature([
      ClassroomPost,
      ClassroomPostComment,
      Classroom,
      ClassroomAccess,
      Notification,
    ]),
  ],
  controllers: [PostController],
  providers: [PostService],
  exports: [PostService],
})
export class PostModule {} 