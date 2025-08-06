import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToOne, JoinColumn } from 'typeorm';
import { School } from './school.schema';
import { User } from './user.schema';

@Entity('school_staff')
export class SchoolStaff {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, {
    nullable: false,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => School, {
    nullable: true,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'school_id' })
  school: School;

  @Column({ type: 'boolean', default: false })
  is_verified: boolean;

  // @Column({ type: 'varchar', default: 'unverified' })
  // status: 'unverified' | 'verified' | 'rejected';

  // @Column({ type: 'varchar', nullable: true })
  // department?: string;

  // @Column({ type: 'varchar', nullable: true })
  // designation?: string;

  // @Column({ type: 'varchar', nullable: true })
  // employee_id?: string;

  // @Column({ type: 'jsonb', nullable: true })
  // permissions?: {
  //   can_manage_staff: boolean;
  //   can_manage_students: boolean;
  //   can_manage_classes: boolean;
  //   can_manage_attendance: boolean;
  //   can_manage_grades: boolean;
  //   can_manage_schedules: boolean;
  //   can_manage_announcements: boolean;
  //   can_manage_events: boolean;
  //   can_manage_reports: boolean;
  //   can_manage_settings: boolean;
  // };

  // @Column({ type: 'jsonb', nullable: true })
  // teaching_details?: {
  //   subjects: string[];
  //   grades: string[];
  //   sections: string[];
  // };

  // @Column({ type: 'timestamp', nullable: true })
  // joined_at?: Date;

  // @Column({ type: 'timestamp', nullable: true })
  // last_active_at?: Date;

  // store time in utc
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;
} 