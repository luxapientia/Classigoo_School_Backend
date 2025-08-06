import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Classroom } from '../../core/schemas/classroom.schema';
import { Message } from './message.schema';
import { MessageRoomUser } from './message-room-user.schema';

@Entity('message_rooms')
export class MessageRoom {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'enum', enum: ['all', 'single'], nullable: false })
  type: string;

  @ManyToOne(() => Classroom, {
    nullable: false,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'classroom_id' })
  classroom: Classroom;

  @OneToMany(() => Message, message => message.room, {
    cascade: true,
  })
  messages: Message[];

  @OneToMany(() => MessageRoomUser, roomUser => roomUser.room, {
    cascade: true,
  })
  users: MessageRoomUser[];

  @Column({ type: 'timestamp', nullable: false })
  active_at: Date;

  // store time in utc
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;
} 