import { Injectable, NotFoundException, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note } from './schemas/note.schema';
import { ClassroomNote } from './schemas/classroom-note.schema';
import { Classroom } from '../classroom/core/schemas/classroom.schema';
import { ClassroomAccess } from '../classroom/core/schemas/classroom-access.schema';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { JwtPayload } from '../../common/decorators/user.decorator';
import { PubSubService } from '../../shared/services/pubsub.service';

@Injectable()
export class NoteService {
  constructor(
    @InjectRepository(Note)
    private noteRepository: Repository<Note>,
    @InjectRepository(ClassroomNote)
    private classroomNoteRepository: Repository<ClassroomNote>,
    @InjectRepository(Classroom)
    private classroomRepository: Repository<Classroom>,
    @InjectRepository(ClassroomAccess)
    private classroomAccessRepository: Repository<ClassroomAccess>,
    private readonly pubSubService: PubSubService
  ) {}

  async getNotes(userId: string, user: JwtPayload) {
    try {
      if (userId !== user.user_id) {
        throw new UnauthorizedException('You do not have permission to view this notes');
      }

      const notes = await this.noteRepository
        .createQueryBuilder('note')
        .where('note.owner = :userId', { userId })
        .select([
          'note.id as id',
          'note.status as status',
          'note.title as title',
          'note.updated_at as updated_at'
        ])
        .orderBy('note.updated_at', 'DESC')
        .getRawMany();

      return {
        status: 'success',
        message: 'Notes retrieved successfully',
        data: notes
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to get notes');
    }
  }

  async getNoteById(id: string, user: JwtPayload) {
    try {
      const note = await this.noteRepository
        .createQueryBuilder('note')
        .leftJoinAndSelect('note.owner', 'owner')
        .leftJoinAndSelect('note.classroom_notes', 'classroom_note')
        .leftJoinAndSelect('classroom_note.classroom', 'classroom')
        .where('note.id = :id', { id })
        .getOne();

      if (!note) {
        throw new NotFoundException('Note not found');
      }

      if (note.owner.id !== user.user_id) {
        throw new UnauthorizedException('You do not have permission to view this note');
      }

      // Format the response exactly like MongoDB's output
      const formattedNote = {
        id: note.id,
        status: note.status,
        title: note.title,
        content: note.content,
        updated_at: note.updated_at,
            owner_data: {
          id: note.owner.id,
          name: note.owner.name,
          email: note.owner.email,
          avatar: note.owner.avatar
            },
        classroom_notes: note.classroom_notes
          .filter(cn => cn.classroom) // Only include if classroom exists
          .map(cn => ({
            classroom: {
              id: cn.classroom.id,
              name: cn.classroom.name
          }
          }))
      };

      return {
        status: 'success',
        message: 'Note retrieved successfully',
        data: formattedNote
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to get note');
    }
  }

  async createNote(createNoteDto: CreateNoteDto, user: JwtPayload) {
    try {
      // Create note
      const note = this.noteRepository.create({
        ...createNoteDto,
        owner: { id: user.user_id }
      });

      const savedNote = await this.noteRepository.save(note);

      // Create classroom associations
      if (createNoteDto.classroom_ids.length > 0) {
        const classroomNotes = createNoteDto.classroom_ids.map(classroomId =>
          this.classroomNoteRepository.create({
            note: savedNote,
            classroom: { id: classroomId }
          })
        );

        await this.classroomNoteRepository.save(classroomNotes);
      }

      return {
        status: 'success',
        message: 'Note created successfully',
        id: savedNote.id
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create note');
    }
  }

  async updateNote(updateNoteDto: UpdateNoteDto, user: JwtPayload) {
    try {
      const note = await this.noteRepository.findOne({
        where: { id: updateNoteDto.id },
        relations: ['owner']
      });

      if (!note) {
        throw new NotFoundException('Note not found');
      }

      if (note.owner.id !== user.user_id) {
        throw new UnauthorizedException('You do not have permission to update this note');
      }

      // Update note
      await this.noteRepository.update(note.id, {
          title: updateNoteDto.title,
          content: updateNoteDto.content,
          status: updateNoteDto.status
      });

      // Update classroom associations
      await this.classroomNoteRepository.delete({ note: { id: note.id } });
      
      const validClassroomIds = updateNoteDto.classroom_ids.filter(id => id !== '');
      if (validClassroomIds.length > 0) {
        const classroomNotes = validClassroomIds.map(classroomId =>
          this.classroomNoteRepository.create({
            note: { id: note.id },
            classroom: { id: classroomId }
          })
        );

        await this.classroomNoteRepository.save(classroomNotes);
      }

      return {
        status: 'success',
        message: 'Note updated successfully',
        id: note.id
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update note');
    }
  }

  async deleteNote(id: string, user: JwtPayload) {
    try {
      const note = await this.noteRepository.findOne({
        where: { id },
        relations: ['owner']
      });

      if (!note) {
        throw new NotFoundException('Note not found');
      }

      if (note.owner.id !== user.user_id) {
        throw new UnauthorizedException('You do not have permission to delete this note');
      }

      await this.noteRepository.remove(note);

      return {
        status: 'success',
        message: 'Note deleted successfully',
        id: note.id
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete note');
    }
  }

  async getClassroomNotes(classId: string, user: JwtPayload) {
    try {
      // Check if classroom exists
      const classroom = await this.classroomRepository.findOne({
        where: { id: classId }
      });

      if (!classroom) {
        throw new NotFoundException('Classroom not found');
      }
      
      // Check user access
      const classroomAccess = await this.classroomAccessRepository.findOne({
        where: {
          classroom: { id: classId },
          user: { id: user.user_id },
        status: 'accepted'
        }
      });

      if (!classroomAccess) {
        throw new UnauthorizedException('You do not have permission to view this classroom notes');
      }

      // Get notes with their owners
      const notes = await this.classroomNoteRepository
        .createQueryBuilder('classroom_note')
        .leftJoinAndSelect('classroom_note.note', 'note')
        .leftJoinAndSelect('note.owner', 'owner')
        .where('classroom_note.classroom = :classId', { classId })
        .andWhere('note.status = :status', { status: 'published' })
        .select([
          'note.id as id',
          'note.status as status',
          'note.title as title',
          'note.updated_at as updated_at',
          'owner.name as owner_name'
        ])
        .orderBy('note.updated_at', 'DESC')
        .getRawMany();

      // Format response to match MongoDB output
      const formattedNotes = notes.map(note => ({
        id: note.id,
        status: note.status,
        title: note.title,
        updated_at: note.updated_at,
            owner_data: {
          name: note.owner_name
            }
      }));

      return {
        status: 'success',
        message: 'Classroom notes retrieved successfully',
        data: formattedNotes
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to get classroom notes');
    }
  }
} 