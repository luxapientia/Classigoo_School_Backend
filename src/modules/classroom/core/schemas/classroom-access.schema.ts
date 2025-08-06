import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../../auth/schemas/user.schema';
import { Classroom } from './classroom.schema';

@Entity('classroom_access')
export class ClassroomAccess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Classroom, classroom => classroom.classroom_relation, {
    nullable: false,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'class_id' })
  classroom: Classroom;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: ['owner', 'teacher', 'parent', 'student'], nullable: false })
  role: string;

  @Column({ type: 'enum', enum: ['pending', 'accepted', 'rejected'], nullable: false })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
} 