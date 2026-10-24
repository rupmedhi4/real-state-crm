import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Contact } from '../contacts/contact.entity';
import { Property } from '../properties/property.entity';
import { User } from '../users/user.entity';

@Entity('site_visits')
export class Visit extends BaseEntity {
  @ManyToOne(() => Contact, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contactId' })
  contact: Contact;

  @Index()
  @Column({ type: 'uuid' })
  contactId: string;

  @ManyToOne(() => Property, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'propertyId' })
  property: Property | null;

  @Column({ type: 'uuid', nullable: true })
  propertyId: string | null;

  @Index()
  @Column({ type: 'date' })
  visitDate: string;

  @Column({ type: 'varchar', length: 5, nullable: true })
  visitTime: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agentId' })
  agent: User | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  agentId: string | null;

  @Index()
  @Column({ length: 20, default: 'Scheduled' })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /** Client feedback recorded after the visit. */
  @Column({ type: 'text', nullable: true })
  feedback: string | null;
}
