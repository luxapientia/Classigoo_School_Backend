import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Classroom } from '../../core/schemas/classroom.schema';
import { User } from '../../../../modules/auth/schemas/user.schema';
import { AssignmentSubmission } from './assignment-submission.schema';

@Entity('assignments')
export class Assignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  title: string;

  @Column({ type: 'text', nullable: false })
  content: string;

  @ManyToOne(() => Classroom, {
    nullable: false,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'class_id' })
  classroom: Classroom;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'creator_id' })
  creator: User;

  @OneToMany(() => AssignmentSubmission, submission => submission.assignment, {
    cascade: true
  })
  submissions: AssignmentSubmission[];

  @Column({ type: 'simple-array', default: ['*'] })
  audience: string[];

  @Column({ type: 'jsonb', default: [] })
  files: any[];

  @Column({ type: 'timestamp', nullable: false })
  deadline: Date;

  @Column({ type: 'enum', enum: ['draft', 'published'], default: 'draft' })
  status: string;

  // store time in utc
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;
} 