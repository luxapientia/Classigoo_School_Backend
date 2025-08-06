import { Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
// import { School } from './school.schema';
import { User } from './user.schema';

@Entity('community_member')
export class CommunityMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, {
    nullable: false,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // @ManyToOne(() => School, {
  //   nullable: false,
  //   onDelete: 'CASCADE'
  // })
  // @JoinColumn({ name: 'school_id' })
  // school: School;

  // Student specific fields
  // @Column({ type: 'varchar', nullable: true })
  // student_id?: string;

  // @Column({ type: 'varchar', nullable: true })
  // grade?: string;

  // @Column({ type: 'varchar', nullable: true })
  // section?: string;

  // @Column({ type: 'varchar', nullable: true })
  // roll_number?: string;

  // @Column({ type: 'jsonb', nullable: true })
  // academic_details?: {
  //   admission_date?: Date;
  //   previous_school?: string;
  //   achievements?: string[];
  //   extracurricular_activities?: string[];
  // };

  // // Parent specific fields
  // @Column({ type: 'varchar', nullable: true })
  // relation_to_student?: 'father' | 'mother' | 'guardian';

  // @Column({ type: 'varchar', nullable: true })
  // occupation?: string;

  // @Column({ type: 'jsonb', nullable: true })
  // emergency_contact?: {
  //   name: string;
  //   phone: string;
  //   relation: string;
  // };

  // // Common fields
  // @Column({ type: 'jsonb', nullable: true })
  // permissions?: {
  //   can_view_grades: boolean;
  //   can_view_attendance: boolean;
  //   can_view_schedule: boolean;
  //   can_view_announcements: boolean;
  //   can_view_events: boolean;
  //   can_view_reports: boolean;
  //   can_communicate_with_teachers: boolean;
  //   can_submit_assignments: boolean;
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