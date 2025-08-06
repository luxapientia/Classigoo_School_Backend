import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from './config/config.module';
import { ConfigService } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { AccountModule } from './modules/account/account.module';
import { SharedModule } from './shared/shared.module';
import { ClassroomModule } from './modules/classroom/classroom.module';
import { NoteModule } from './modules/note/note.module';
import { LearningModule } from './modules/learning/learning.module';
import { NotificationModule } from './modules/notification/notification.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('database.mongodb.uri'),
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.postgres.host'),
        port: configService.get<number>('database.postgres.port'),
        username: configService.get<string>('database.postgres.user'),
        password: configService.get<string>('database.postgres.password'),
        database: configService.get<string>('database.postgres.name'),
        autoLoadEntities: true,
        synchronize: true,
        timezone: 'UTC',
        extra: {
          timezone: 'UTC',
        },
      }),
      inject: [ConfigService],
    }),
    SharedModule,
    AuthModule,
    AccountModule,
    ClassroomModule,
    NoteModule,
    LearningModule,
    NotificationModule,
  ],
})
export class AppModule {}
