import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Classroom } from '../../core/schemas/classroom.schema';
import { ClassroomPost } from './classroom-post.schema';
import { User } from '../../../../modules/auth/schemas/user.schema';

@Entity('classroom_post_comments')
export class ClassroomPostComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ClassroomPost, { nullable: false })
  @JoinColumn({ name: 'post_id' })
  post: ClassroomPost;

  @ManyToOne(() => Classroom, { nullable: false })
  @JoinColumn({ name: 'class_id' })
  classroom: Classroom;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text', nullable: false })
  content: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
} 