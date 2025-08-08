import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { SharedModule } from '../../shared/shared.module';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { User } from '../auth/schemas/user.schema';
import { ChildParent } from './schemas/child-parent.schema';
import { Notification } from '../notification/schemas/notification.schema';

@Module({
  imports: [
    SharedModule,
    TypeOrmModule.forFeature([
      User,
      ChildParent,
      Notification,
    ]),
    ConfigModule,
  ],
  controllers: [SubscriptionController],
  providers: [SubscriptionService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {} 