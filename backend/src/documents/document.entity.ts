import { Exclude } from 'class-transformer';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Contact } from '../contacts/contact.entity';
import { Deal } from '../deals/deal.entity';
import { Property } from '../properties/property.entity';
import { User } from '../users/user.entity';

/** Private file metadata. Downloads go through an authenticated endpoint. */
@Entity('documents')
export class CrmDocument extends BaseEntity {
  @Column({ length: 255 })
  originalName: string;

  @Exclude()
  @Column({ length: 255, select: false })
  storageKey: string;

  @Column({ length: 100 })
  mimeType: string;

  @Column({ type: 'int' })
  sizeBytes: number;

  @Index()
  @Column({ length: 40, default: 'Other' })
  category: string;

  @ManyToOne(() => Contact, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contactId' })
  contact: Contact | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  contactId: string | null;

  @ManyToOne(() => Property, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'propertyId' })
  property: Property | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  propertyId: string | null;

  @ManyToOne(() => Deal, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dealId' })
  deal: Deal | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  dealId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: User | null;

  @Column({ type: 'uuid', nullable: true })
  uploadedById: string | null;
}
