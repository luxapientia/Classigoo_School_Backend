import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/schemas/user.schema';

@Entity('child_parent')
export class ChildParent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'child_id' })
  child: User;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'parent_id' })
  parent: User;

  @Column({ 
    type: 'enum', 
    enum: ['pending', 'accepted', 'rejected'], 
    default: 'pending' 
  })
  status: string;

  // store time in utc
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;
} 