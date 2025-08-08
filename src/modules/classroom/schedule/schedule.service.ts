import { Injectable, NotFoundException, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Schedule } from './schemas/schedule.schema';
import { Classroom } from '../core/schemas/classroom.schema';
import { ClassroomAccess } from '../core/schemas/classroom-access.schema';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { JwtPayload } from '../../../common/decorators/user.decorator';
import { PubSubService } from '../../../shared/services/pubsub.service';

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(Schedule)
    private scheduleRepository: Repository<Schedule>,
    @InjectRepository(Classroom)
    private classroomRepository: Repository<Classroom>,
    @InjectRepository(ClassroomAccess)
    private classroomAccessRepository: Repository<ClassroomAccess>,
    private readonly pubSubService: PubSubService
  ) {}

  private async checkTeacherAccess(classId: string, userId: string): Promise<void> {
    const access = await this.classroomAccessRepository.findOne({
      where: {
        classroom: { id: classId },
        user: { id: userId },
        status: 'accepted',
        role: In(['teacher', 'owner']) // TypeORM will handle the IN condition through the entity definition
      }
    });

    if (!access) {
      throw new UnauthorizedException('Only teachers and owners can modify schedules');
    }
  }

  private async checkClassAccess(classId: string, userId: string): Promise<void> {
    const access = await this.classroomAccessRepository.findOne({
      where: {
        classroom: { id: classId },
        user: { id: userId },
        status: 'accepted'
      }
    });

    if (!access) {
      throw new UnauthorizedException('You do not have access to this classroom');
    }
  }

  async getClassroomSchedules(classId: string, user: JwtPayload) {
    try {
      await this.checkClassAccess(classId, user.user_id);

      const schedules = await this.scheduleRepository
        .createQueryBuilder('schedule')
        .leftJoinAndSelect('schedule.owner', 'owner')
        .where('schedule.class_id = :classId', { classId })
        .orderBy('schedule.start_time', 'DESC')
        .select([
          'schedule.id',
          'schedule.title',
          'schedule.description',
          'schedule.start_time',
          'schedule.end_time',
          'schedule.created_at',
          'schedule.updated_at',
          'owner.id',
          'owner.name',
          'owner.email',
          'owner.avatar'
        ])
        .getMany();

      const formattedSchedules = schedules.map(schedule => ({
        id: schedule.id,
        title: schedule.title,
        description: schedule.description,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        created_at: schedule.created_at,
        updated_at: schedule.updated_at,
        owner: {
          id: schedule.owner.id,
          name: schedule.owner.name,
          email: schedule.owner.email,
          avatar: schedule.owner.avatar
        }
      }));

      return {
        status: 'success',
        message: 'Schedules retrieved successfully',
        data: formattedSchedules
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to get schedules');
    }
  }

  async createSchedule(createScheduleDto: CreateScheduleDto, user: JwtPayload) {
    try {
      await this.checkTeacherAccess(createScheduleDto.class_id, user.user_id);

      const schedule = this.scheduleRepository.create({
        ...createScheduleDto,
        owner: { id: user.user_id },
        classroom: { id: createScheduleDto.class_id }
      });

      const savedSchedule = await this.scheduleRepository.save(schedule);

      // Publish event
      await this.pubSubService.publish('schedule.updated', {
        cid: createScheduleDto.class_id
      });

      return {
        status: 'success',
        message: 'Schedule created successfully',
        data: {
          id: savedSchedule.id
        }
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create schedule');
    }
  }

  async updateSchedule(updateScheduleDto: UpdateScheduleDto, user: JwtPayload) {
    try {
      const schedule = await this.scheduleRepository.findOne({
        where: { id: updateScheduleDto.id },
        relations: ['classroom']
      });

      if (!schedule) {
        throw new NotFoundException('Schedule not found');
      }

      await this.checkTeacherAccess(schedule.classroom.id, user.user_id);

      const updatedSchedule = await this.scheduleRepository.save({
        ...schedule,
        title: updateScheduleDto.title,
        description: updateScheduleDto.description,
        start_time: updateScheduleDto.start_time,
        end_time: updateScheduleDto.end_time
      });

      // Publish event
      await this.pubSubService.publish('schedule.updated', {
        cid: schedule.classroom.id
      });

      return {
        status: 'success',
        message: 'Schedule updated successfully',
        data: {
          id: updatedSchedule.id
        }
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update schedule');
    }
  }

  async deleteSchedule(id: string, user: JwtPayload) {
    try {
      const schedule = await this.scheduleRepository.findOne({
        where: { id },
        relations: ['classroom']
      });

      if (!schedule) {
        throw new NotFoundException('Schedule not found');
      }

      await this.checkTeacherAccess(schedule.classroom.id, user.user_id);

      await this.scheduleRepository.remove(schedule);

      // Publish event
      await this.pubSubService.publish('schedule.updated', {
        cid: schedule.classroom.id
      });

      return {
        status: 'success',
        message: 'Schedule deleted successfully',
        data: {
          id: schedule.id
        }
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete schedule');
    }
  }
} 