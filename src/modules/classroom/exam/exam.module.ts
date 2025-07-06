import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamController } from './exam.controller';
import { ExamService } from './exam.service';
import { Exam } from './schemas/exam.schema';
import { ExamSubmission } from './schemas/exam-submission.schema';
import { Classroom } from '../core/schemas/classroom.schema';
import { ClassroomAccess } from '../core/schemas/classroom-access.schema';
import { SharedModule } from '../../../shared/shared.module'; 

@Module({
  imports: [
    SharedModule,
    TypeOrmModule.forFeature([
      Exam,
      ExamSubmission,
      Classroom,
      ClassroomAccess,
    ]),
  ],
  controllers: [ExamController],
  providers: [ExamService],
  exports: [ExamService],
})
export class ExamModule {} 