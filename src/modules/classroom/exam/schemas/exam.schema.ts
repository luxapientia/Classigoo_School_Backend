import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Classroom } from '../../core/schemas/classroom.schema';
import { User } from '../../../../modules/auth/schemas/user.schema';
import { ExamSubmission } from './exam-submission.schema';

@Entity('exams')
export class Exam {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  title: string;

  @Column({ type: 'text', nullable: false })
  content: string;

  @ManyToOne(() => Classroom, { nullable: false })
  @JoinColumn({ name: 'class_id' })
  classroom: Classroom;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @OneToMany(() => ExamSubmission, submission => submission.exam)
  submissions: ExamSubmission[];

  @Column({ type: 'simple-array', default: ['*'] })
  audience: string[];

  @Column({ type: 'jsonb', nullable: false })
  questions: any[];

  @Column({ type: 'integer', nullable: false })
  duration: number;

  @Column({ type: 'timestamp', nullable: true })
  start_once?: Date;

  @Column({ type: 'enum', enum: ['draft', 'published'], default: 'draft' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
} 