import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Exam } from './exam.schema';
import { User } from '../../../../modules/auth/schemas/user.schema';

@Entity('exam_submissions')
export class ExamSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Exam, {
    nullable: false,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'exam_id' })
  exam: Exam;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'jsonb', default: [] })
  answers: any[];

  @Column({ type: 'jsonb', default: [] })
  markings: any[];

  @Column({ type: 'varchar', nullable: false })
  status: string;

  // store time in utc
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;
} 