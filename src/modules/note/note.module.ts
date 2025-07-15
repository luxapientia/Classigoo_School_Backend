import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NoteController } from './note.controller';
import { NoteService } from './note.service';
import { Note } from './schemas/note.schema';
import { ClassroomNote } from './schemas/classroom-note.schema';
import { Classroom } from '../classroom/core/schemas/classroom.schema';
import { ClassroomAccess } from '../classroom/core/schemas/classroom-access.schema';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Note,
      ClassroomNote,
      Classroom,
      ClassroomAccess
    ]),
    SharedModule
  ],
  controllers: [NoteController],
  providers: [NoteService],
  exports: [NoteService]
})
export class NoteModule {} 