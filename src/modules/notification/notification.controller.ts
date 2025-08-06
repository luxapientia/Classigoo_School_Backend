import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { UserGuard } from '../../shared/guards/user.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/user.decorator';
import { FetchNotificationsResponseDto } from './dto/notification-response.dto';
import { MarkAsReadDto, MarkAsReadResponseDto } from './dto/mark-as-read.dto';
import { MarkAllAsReadResponseDto } from './dto/mark-all-as-read.dto';

@Controller('v1/notification')
@UseGuards(UserGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async fetchNotifications(
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0
  ): Promise<FetchNotificationsResponseDto> {
    return this.notificationService.fetchNotifications(user, limit, offset);
  }

  @Post('mark-as-read')
  async markAsRead(
    @Body() markAsReadDto: MarkAsReadDto,
    @CurrentUser() user: JwtPayload
  ): Promise<MarkAsReadResponseDto> {
    return this.notificationService.markAsRead(markAsReadDto, user);
  }

  @Post('mark-all-read')
  async markAllAsRead(
    @CurrentUser() user: JwtPayload
  ): Promise<MarkAllAsReadResponseDto> {
    return this.notificationService.markAllAsRead(user);
  }
}