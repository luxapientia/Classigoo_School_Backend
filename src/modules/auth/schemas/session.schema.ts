import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.schema';

@Entity('session')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', nullable: false })
  session_token: string;

  @Column({ type: 'timestamp', nullable: false })
  session_expiry: Date;

  @Column({ type: 'jsonb', nullable: false })
  security: {
    ip: string;
    platform?: string;
    os?: string;
    device?: string;
    location?: string;
  };

  @Column({ type: 'varchar', nullable: true })
  push_token?: string;

  @Column({ type: 'boolean', default: false })
  expired: boolean;

  // store time in utc
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;
}
