import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { SchoolStaff } from './school_staff.schema';

@Entity('school')
export class School {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  name: string;

  // @Column({ type: 'varchar', unique: true, nullable: false })
  // code: string;

  // @Column({ type: 'varchar', nullable: false })
  // address: string;

  // @Column({ type: 'varchar', nullable: false })
  // city: string;

  // @Column({ type: 'varchar', nullable: false })
  // state: string;

  // @Column({ type: 'varchar', nullable: false })
  // country: string;

  // @Column({ type: 'varchar', nullable: false })
  // zip_code: string;

  // @Column({ type: 'varchar', nullable: false })
  // phone: string;

  // @Column({ type: 'varchar', nullable: false })
  // email: string;

  // @Column({ type: 'varchar', nullable: true })
  // website?: string;

  // @Column({ type: 'jsonb', default: { bucketKey: '', url: '' } })
  // logo: {
  //   bucketKey: string;
  //   url: string;
  // };

  // @Column({ type: 'jsonb', nullable: true })
  // social_media?: {
  //   facebook?: string;
  //   twitter?: string;
  //   instagram?: string;
  //   linkedin?: string;
  // };

  // @Column({ type: 'varchar', default: 'active' })
  // status: string;

  // @Column({ type: 'jsonb', nullable: true })
  // subscription?: {
  //   plan: string;
  //   status: string;
  //   start_date: Date;
  //   end_date: Date;
  //   billing_cycle: string;
  // };

  // @Column({ type: 'jsonb', nullable: true })
  // settings?: {
  //   languages: string[];
  //   timezone: string;
  //   academic_year: {
  //     start_date: Date;
  //     end_date: Date;
  //   };
  //   grading_system: string;
  //   notification_preferences: {
  //     email: boolean;
  //     sms: boolean;
  //     push: boolean;
  //   };
  // };

  // Relations
  @OneToMany(() => SchoolStaff, (staff) => staff.school)
  staff: SchoolStaff[];

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
} 