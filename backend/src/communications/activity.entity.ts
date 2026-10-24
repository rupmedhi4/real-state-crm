import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Contact } from '../contacts/contact.entity';
import { User } from '../users/user.entity';

/** One entry in a contact's communication history: call, meeting, note... */
@Entity('activities')
export class Activity extends BaseEntity {
  @ManyToOne(() => Contact, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contactId' })
  contact: Contact;

  @Index()
  @Column({ type: 'uuid' })
  contactId: string;

  @Column({ length: 20 })
  type: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  outcome: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agentId' })
  agent: User | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  agentId: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Index()
  @Column({ type: 'timestamptz', default: () => 'now()' })
  occurredAt: Date;
}
