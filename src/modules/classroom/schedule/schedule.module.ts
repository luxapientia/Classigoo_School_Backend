import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Schedule } from './schemas/schedule.schema';
import { Classroom } from '../core/schemas/classroom.schema';
import { ClassroomAccess } from '../core/schemas/classroom-access.schema';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { SharedModule } from '../../../shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Schedule,
      Classroom,
      ClassroomAccess
    ]),
    SharedModule
  ],
  controllers: [ScheduleController],
  providers: [ScheduleService],
  exports: [ScheduleService]
})
export class ScheduleModule {} 