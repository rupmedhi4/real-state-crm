import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { numericTransformer } from '../common/transformers';
import { User } from '../users/user.entity';
import { PropertyImage } from './property-image.entity';

@Entity('properties')
export class Property extends BaseEntity {
  @Index()
  @Column({ length: 150 })
  title: string;

  @Column({ length: 10, default: 'Sale' })
  listingType: string;

  @Column({ length: 30, default: 'Residential' })
  category: string;

  @Column({ length: 30, default: 'Apartment' })
  propertyType: string;

  /** Sale price, or monthly rent for rental listings. */
  @Column({ type: 'bigint', nullable: true, transformer: numericTransformer })
  price: number | null;

  @Column({ type: 'int', nullable: true })
  bedrooms: number | null;

  @Column({ type: 'int', nullable: true })
  areaSqft: number | null;

  @Index()
  @Column({ type: 'varchar', length: 80, nullable: true })
  city: string | null;

  @Index()
  @Column({ type: 'varchar', length: 120, nullable: true })
  locality: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string | null;

  @Index()
  @Column({ length: 20, default: 'Available' })
  status: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int', nullable: true })
  bathrooms: number | null;

  @Column({ type: 'int', nullable: true })
  balconies: number | null;

  @Column({ type: 'int', nullable: true })
  parkingSpaces: number | null;

  @Column({ type: 'int', nullable: true })
  floorNumber: number | null;

  @Column({ type: 'int', nullable: true })
  totalFloors: number | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  furnishing: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  possessionStatus: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  facing: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  reraNumber: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  ownerName: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  ownerPhone: string | null;

  @Column({ type: 'text', nullable: true })
  amenities: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agentId' })
  agent: User | null;

  @Column({ type: 'uuid', nullable: true })
  agentId: string | null;

  @OneToMany(() => PropertyImage, (img) => img.property)
  images: PropertyImage[];
}
