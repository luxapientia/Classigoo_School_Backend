import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from '../../../shared/shared.module';
import { MemberController } from './member.controller';
import { MemberService } from './member.service';
import { VirtualStudent } from './schemas/virtual-student.schema';
import { Classroom } from '../core/schemas/classroom.schema';
import { ClassroomAccess } from '../core/schemas/classroom-access.schema';
import { Notification } from '../../notification/schemas/notification.schema';
import { MailService } from '../../../common/utils/mail.service';
import { User } from '../../../modules/auth/schemas/user.schema';
import { InvitationCodeUtil } from './utils/invitation-code.util';

@Module({
  imports: [
    SharedModule,
    TypeOrmModule.forFeature([
      Classroom,
      ClassroomAccess,
      Notification,
      User,
      VirtualStudent,
    ]),
  ],
  controllers: [MemberController],
  providers: [MemberService, MailService, InvitationCodeUtil],
  exports: [MemberService],
})
export class MemberModule {} 