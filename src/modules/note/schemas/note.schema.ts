import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from '../../../modules/auth/schemas/user.schema';
import { ClassroomNote } from './classroom-note.schema';

@Entity('notes')
export class Note {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  title: string;

  @Column({ type: 'text', nullable: false })
  content: string;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ type: 'varchar', nullable: false })
  status: string;

  @Column({ type: 'boolean', default: false })
  is_folder: boolean;

  @Column({ type: 'boolean', default: false })
  is_public: boolean;

  @Column({ type: 'varchar', nullable: true })
  parent_folder: string;

  @Column({ type: 'simple-array', default: ['*'] })
  audience: string[];

  @OneToMany(() => ClassroomNote, classroomNote => classroomNote.note, {
    cascade: true
  })
  classroom_notes: ClassroomNote[];

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
} 