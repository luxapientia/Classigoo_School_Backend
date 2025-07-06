import { Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { MessageRoom } from './message-room.schema';
import { User } from '../../../../modules/auth/schemas/user.schema';

@Entity('message_room_users')
export class MessageRoomUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MessageRoom, room => room.users, { 
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

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
} 