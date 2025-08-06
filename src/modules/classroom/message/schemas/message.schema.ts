import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { MessageRoom } from './message-room.schema';
import { User } from '../../../auth/schemas/user.schema';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MessageRoom, room => room.messages, { 
    nullable: false,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'room_id' })
  room: MessageRoom;

  @ManyToOne(() => User, { 
    nullable: false,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'jsonb', nullable: false })
  content: Record<string, any>;

  // store time in utc
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;
} 