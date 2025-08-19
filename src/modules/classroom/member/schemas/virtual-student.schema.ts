import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../../auth/schemas/user.schema';
import { Classroom } from '../../core/schemas/classroom.schema';

@Entity('virtual_student')
export class VirtualStudent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  profile_picture: string;

  @ManyToOne(() => Classroom, classroom => classroom.id, {
    nullable: false,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'classroom_id' })
  classroom: Classroom;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL'
  })
  @JoinColumn({ name: 'parent_id' })
  parent: User;

  @Column({ type: 'varchar', length: 10, unique: true, nullable: false })
  invitation_code: string;

  @Column({ type: 'boolean', default: false })
  parent_connected: boolean;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'created_by' })
  created_by: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;
} 