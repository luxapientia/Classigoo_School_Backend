import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../../../modules/auth/schemas/user.schema';
import { Classroom } from '../../core/schemas/classroom.schema';

@Entity('schedules')
export class Schedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  title: string;

  @Column({ type: 'text', nullable: false })
  description: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @ManyToOne(() => Classroom, { nullable: false })
  @JoinColumn({ name: 'class_id' })
  classroom: Classroom;

  @Column({ type: 'timestamp', nullable: false })
  start_time: Date;

  @Column({ type: 'timestamp', nullable: false })
  end_time: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
} 