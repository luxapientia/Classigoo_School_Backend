import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from '../../../shared/shared.module';
import { MemberController } from './member.controller';
import { MemberService } from './member.service';
import { Classroom } from '../core/schemas/classroom.schema';
import { ClassroomAccess } from '../core/schemas/classroom-access.schema';
import { Notification } from '../../notification/schemas/notification.schema';
import { MailService } from '../../../common/utils/mail.service';
import { User } from '../../../modules/auth/schemas/user.schema';

@Module({
  imports: [
    SharedModule,
    TypeOrmModule.forFeature([
      Classroom,
      ClassroomAccess,
      Notification,
      User,
    ]),
  ],
  controllers: [MemberController],
  providers: [MemberService, MailService],
  exports: [MemberService],
})
export class MemberModule {} 