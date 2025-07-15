import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Note } from './note.schema';
import { Classroom } from '../../classroom/core/schemas/classroom.schema';

@Entity('classroom_notes')
export class ClassroomNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Note, note => note.classroom_notes, {
    nullable: false,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'note_id' })
  note: Note;

  @ManyToOne(() => Classroom, {
    nullable: false,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'class_id' })
  classroom: Classroom;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
} 