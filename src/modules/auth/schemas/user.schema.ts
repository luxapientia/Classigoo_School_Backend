import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Session } from './session.schema';
import { ClassroomAccess } from '../../classroom/core/schemas/classroom-access.schema';
import { Otp } from './otp.schema';
import { Notification } from '../../notification/schemas/notification.schema';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'varchar', nullable: false })
  email: string;

  @Column({ type: 'varchar', default: '' })
  // role: 'principal' | 'assistant_principal' | 'teacher' | 'staff' | 'student' | 'parent' | 'class_monitor' | 'admin';
  role: string;
  
  @Column({ type: 'varchar', nullable: true })
  gender?: string;

  @Column({ type: 'jsonb', default: { bucketKey: '', url: '' } })
  avatar: {
    bucketKey: string;
    url: string;
  };

  @Column({ type: 'varchar', nullable: true })
  birthday?: string;

  @Column({ type: 'varchar', nullable: true })
  phone?: string;

  @Column({ type: 'varchar', nullable: true })
  institution?: string;

  @Column({ type: 'varchar', nullable: true })
  bio?: string;

  @Column({ type: 'jsonb', nullable: true })
  address?: {
    address1?: string;
    address2?: string;
    city?: string;
    zip?: string;
    country?: string;
  };

  @Column({ type: 'varchar', default: 'pending' })
  status: string;

  @Column({ type: 'boolean', default: false })
  is_plus: boolean;

  @Column({ type: 'boolean', default: false })
  used_trial: boolean;

  @Column({ type: 'jsonb', nullable: true })
  subscription: {
    stripe_customer_id?: string;
    stripe_subscription_id?: string;
    status?: string;
    current_period_start?: Date;
    current_period_end?: Date;
    trial_start?: Date;
    trial_end?: Date;
    canceled_at?: Date;
    updated_at?: Date;
  };

  // @Column({ type: 'simple-array', nullable: true })
  // sessions: string[];

  // sessions relation
  @OneToMany(() => Session, (session) => session.user, {
    cascade: true
  })
  sessions: Session[];

  @OneToMany(() => Otp, (otp) => otp.user, {
    cascade: true
  })
  otps: Otp[];

  @OneToMany(() => ClassroomAccess, (access) => access.user, {
    cascade: true
  })
  classroomAccesses: ClassroomAccess[];

  @OneToMany(() => Notification, (notification) => notification.user, {
    cascade: true
  })
  notifications: Notification[];

  // classroom relation
  // @OneToMany(() => Classroom, (classroom) => classroom.owner, {
  //   cascade: true
  // })
  // classrooms: Classroom[];

  @Column({ type: 'simple-array', nullable: true })
  children: string[];

  @Column({ type: 'simple-array', nullable: true })
  parents: string[];

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}

