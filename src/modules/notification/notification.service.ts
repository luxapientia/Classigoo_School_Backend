import { Injectable, NotFoundException, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload } from '../../common/decorators/user.decorator';
import { Notification } from './schemas/notification.schema';
import { FetchNotificationsResponseDto, NotificationResponseDto } from './dto/notification-response.dto';
import { MarkAsReadDto, MarkAsReadResponseDto } from './dto/mark-as-read.dto';
import { MarkAllAsReadResponseDto } from './dto/mark-all-as-read.dto';
import { PubSubService } from '../../shared/services/pubsub.service';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification) private notificationRepository: Repository<Notification>,
    private readonly pubSubService: PubSubService,
  ) {}

  async fetchNotifications(
    user: JwtPayload,
    limit: number,
    offset: number
  ): Promise<FetchNotificationsResponseDto> {
    try {

      // Get total count for pagination
      const total = await this.notificationRepository.count({
        where: { user_id: user.user_id }
      });

      // Fetch notifications with pagination using TypeORM query builder
      const notifications = await this.notificationRepository
        .createQueryBuilder('notification')
        .where('notification.user_id = :userId', { userId: user.user_id })
        .orderBy('notification.created_at', 'DESC')
        .skip(Math.max(0, Number(offset) || 0))
        .take(Math.max(0, Number(limit) || 20))
        .select([
          'notification.id as id',
          'notification.user_id as user_id',
          'notification.image as image',
          'notification.content as content',
          'notification.link as link',
          'notification.is_read as is_read',
          'notification.created_at as created_at',
          'notification.updated_at as updated_at'
        ])
        .getRawMany<NotificationResponseDto>();

      return {
        status: 'success',
        message: 'Notifications fetched successfully',
        data: notifications,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not fetch notifications');
    }
  }

  async markAsRead(
    markAsReadDto: MarkAsReadDto,
    user: JwtPayload
  ): Promise<MarkAsReadResponseDto> {
    try {
      const { notification_id } = markAsReadDto;

      // Find the notification and verify ownership
      const notification = await this.notificationRepository.findOne({
        where: { id: notification_id }
      });
      if (!notification) {
        throw new NotFoundException('Notification not found');
      }

      // Verify the notification belongs to the user
      if (notification.user_id !== user.user_id) {
        throw new UnauthorizedException('You can only mark your own notifications as read');
      }

      // Update the notification to mark as read
      await this.notificationRepository.update(
        notification_id,
        { is_read: true }
      );

      // Publish event
      await this.pubSubService.publish('notification.updated', {
        target_id: notification.user_id,
      })

      return {
        status: 'success',
        message: 'Notification marked as read successfully',
        data: notification_id
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not mark notification as read');
    }
  }

  async markAllAsRead(user: JwtPayload): Promise<MarkAllAsReadResponseDto> {
    try {
      // Update all unread notifications for the user
      const result = await this.notificationRepository.update(
        {
          user_id: user.user_id,
          is_read: false,
        },
        { is_read: true }
      );

      // Publish event
      await this.pubSubService.publish('notification.updated', {
        target_id: user.user_id,
      })

      return {
        status: 'success',
        message: 'All notifications marked as read successfully',
        data: {
          updated_count: result.affected || 0,
        },
      };
    } catch {
      throw new InternalServerErrorException('Could not mark all notifications as read');
    }
  }

  // Helper method to create notifications (for internal use)
  // async createNotification(
  //   userId: string,
  //   content: string,
  //   link?: string,
  //   image?: string
  // ): Promise<void> {
  //   try {
  //     await this.notificationRepository.save({
  //       user_id: userId,
  //       content,
  //       link,
  //       image,
  //       is_read: false,
  //     });
  //   } catch (error) {
  //     throw new InternalServerErrorException('Could not create notification');
  //   }
  // }

  // // Helper method to get unread count for a user
  // async getUnreadCount(userId: string): Promise<number> {
  //   try {
  //     return await this.notificationRepository.count({
  //       where: {
  //         user_id: userId,
  //         is_read: false,
  //       }
  //     });
  //   } catch (error) {
  //     throw new InternalServerErrorException('Could not get unread count');
  //   }
  // }
}