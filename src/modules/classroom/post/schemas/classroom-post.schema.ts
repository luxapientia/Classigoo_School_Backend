import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Classroom } from '../../core/schemas/classroom.schema';
import { User } from '../../../../modules/auth/schemas/user.schema';
import { ClassroomPostComment } from './classroom-post-comment.schema';

@Entity('classroom_posts')
export class ClassroomPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Classroom, { nullable: false })
  @JoinColumn({ name: 'classroom_id' })
  classroom: Classroom;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text', nullable: false })
  content: string;

  @Column({ type: 'varchar', nullable: false })
  type: string;

  @Column({ type: 'simple-array', default: ['*'] })
  audience: string[];

  @Column({ type: 'varchar', nullable: false })
  status: string;

  @Column({ type: 'jsonb', default: [] })
  files: any[];

  @Column({ type: 'timestamp', nullable: false })
  published_at: Date;

  @OneToMany(() => ClassroomPostComment, comment => comment.post)
  comments: ClassroomPostComment[];

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
} 