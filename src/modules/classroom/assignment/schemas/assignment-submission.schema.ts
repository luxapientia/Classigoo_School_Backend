import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Assignment } from './assignment.schema';
import { User } from '../../../../modules/auth/schemas/user.schema';

@Entity('assignment_submissions')
export class AssignmentSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Assignment, {
    nullable: false,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'assignment_id' })
  assignment: Assignment;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'jsonb', default: [] })
  files: any[];

  @Column({ type: 'enum', enum: ['draft', 'published'], default: 'draft' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
} 