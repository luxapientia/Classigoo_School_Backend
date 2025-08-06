import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.schema';

@Entity('otp')
export class Otp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // @Column({ type: 'varchar', nullable: false })
  // email: string;
  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', nullable: false })
  otp: string;

  @Column({ type: 'varchar', nullable: false })
  session_token: string;

  @Column({ type: 'boolean', default: false })
  session_remember_me: boolean;

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

  @Column({ type: 'boolean', default: false })
  used: boolean;

  // store time in utc
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;
}
