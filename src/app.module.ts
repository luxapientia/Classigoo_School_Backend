import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from './config/config.module';
import { ConfigService } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { AccountModule } from './modules/account/account.module';
import { SharedModule } from './shared/shared.module';
import { ClassroomModule } from './modules/classroom/classroom.module';
import { NoteModule } from './modules/note/note.module';

@Module({
  imports: [
    ConfigModule,
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
      }),
      inject: [ConfigService],
    }),
    SharedModule,
    AuthModule,
    AccountModule,
    ClassroomModule,
    NoteModule,
  ],
})
export class AppModule {}
