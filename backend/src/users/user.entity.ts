import { Exclude } from 'class-transformer';
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Role } from '../common/constants';

/** A person who can sign in. Agents, managers and admins are all users. */
@Entity('users')
export class User extends BaseEntity {
  @Column({ length: 120 })
  name: string;

  @Index({ unique: true })
  @Column({ length: 160 })
  email: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Exclude()
  @Column({ select: false })
  passwordHash: string;

  @Column({ type: 'enum', enum: Role, default: Role.AGENT })
  role: Role;

  /** Display title shown on the team page, e.g. "Senior Agent". */
  @Column({ length: 40, default: 'Agent' })
  designation: string;

  @Column({ default: true })
  isActive: boolean;
}
