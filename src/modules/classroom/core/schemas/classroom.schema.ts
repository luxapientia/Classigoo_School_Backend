import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from '../../../auth/schemas/user.schema';
import { ClassroomAccess } from './classroom-access.schema';

@Entity('classroom')
export class Classroom {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  room?: string;

  @Column({ type: 'varchar', nullable: true })
  section?: string;

  @Column({ type: 'varchar', nullable: true })
  subject?: string;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ type: 'boolean', default: false })
  child_only: boolean;

  @Column({ type: 'varchar', nullable: false })
  invitation_code: string;

  @Column({ type: 'varchar', nullable: false })
  cover_img: string;

  @OneToMany(() => ClassroomAccess, access => access.classroom, {
    cascade: true,
  })
  classroom_relation: ClassroomAccess[];

  // store time in utc
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;
} 