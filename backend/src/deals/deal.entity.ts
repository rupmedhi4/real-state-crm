import { Expose } from 'class-transformer';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { numericTransformer } from '../common/transformers';
import { Contact } from '../contacts/contact.entity';
import { Property } from '../properties/property.entity';
import { User } from '../users/user.entity';

@Entity('deals')
export class Deal extends BaseEntity {
  @Column({ type: 'varchar', length: 150, nullable: true })
  title: string | null;

  // RESTRICT: a contact with deals cannot be deleted silently.
  @ManyToOne(() => Contact, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'contactId' })
  contact: Contact;

  @Index()
  @Column({ type: 'uuid' })
  contactId: string;

  @ManyToOne(() => Property, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'propertyId' })
  property: Property | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  propertyId: string | null;

  @Column({ type: 'bigint', nullable: true, transformer: numericTransformer })
  value: number | null;

  @Column({ type: 'date', nullable: true })
  expectedClosing: string | null;

  @Index()
  @Column({ length: 30, default: 'New Opportunity' })
  stage: string;

  @Column({ type: 'int', default: 50 })
  probability: number;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 2,
    transformer: numericTransformer,
  })
  commissionPct: number;

  @Column({ length: 30, default: 'Not Started' })
  transactionStatus: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agentId' })
  agent: User | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  agentId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Expose()
  get commissionAmount(): number | null {
    if (this.value == null) return null;
    return Math.round((this.value * (this.commissionPct ?? 0)) / 100);
  }
}
