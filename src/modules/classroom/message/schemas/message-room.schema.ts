import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Classroom } from '../../core/schemas/classroom.schema';

@Entity('message_rooms')
export class MessageRoom {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'enum', enum: ['all', 'single'], nullable: false })
  type: string;

  @ManyToOne(() => Classroom, { nullable: false })
  @JoinColumn({ name: 'classroom_id' })
  classroom: Classroom;

  @Column({ type: 'timestamp', nullable: false })
  active_at: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
} 