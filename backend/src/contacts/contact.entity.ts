import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { numericTransformer } from '../common/transformers';
import { Campaign } from '../marketing/campaign.entity';
import { User } from '../users/user.entity';

/**
 * Leads and clients share one table. A contact is shown as a client once its
 * stage reaches "Qualified" or later (see CLIENT_STAGES).
 */
@Entity('contacts')
export class Contact extends BaseEntity {
  @Index()
  @Column({ length: 120 })
  name: string;

  @Index()
  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  whatsapp: string | null;

  @Index()
  @Column({ type: 'varchar', length: 160, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  occupation: string | null;

  @Index()
  @Column({ length: 60, default: 'Other' })
  source: string;

  @ManyToOne(() => Campaign, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'campaignId' })
  campaign: Campaign | null;

  @Column({ type: 'uuid', nullable: true })
  campaignId: string | null;

  /** Free-text description of what the contact is looking for. */
  @Column({ type: 'varchar', length: 200, nullable: true })
  propertyInterest: string | null;

  @Column({ length: 30, default: 'Residential' })
  propertyCategory: string;

  @Column({ length: 20, default: 'Buy' })
  intent: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  configuration: string | null;

  @Column({ type: 'bigint', nullable: true, transformer: numericTransformer })
  budgetMin: number | null;

  @Column({ type: 'bigint', nullable: true, transformer: numericTransformer })
  budgetMax: number | null;

  /** Client preferences: preferred localities, amenities, floor, etc. */
  @Column({ type: 'text', nullable: true })
  preferences: string | null;

  @Index()
  @Column({ length: 20, default: 'New' })
  stage: string;

  @Column({ length: 10, default: 'Medium' })
  priority: string;

  @Column({ type: 'int', default: 50 })
  score: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agentId' })
  agent: User | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  agentId: string | null;

  @Index()
  @Column({ type: 'date', nullable: true })
  nextFollowup: string | null;

  /** Storage key of the profile photo, served through an authenticated route. */
  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  photoKey: string | null;

  @Column({ default: false })
  hasPhoto: boolean;
}
