import { Exclude, Expose } from 'class-transformer';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Property } from './property.entity';

/** Metadata for an uploaded property photo. The file itself lives in storage. */
@Entity('property_images')
export class PropertyImage extends BaseEntity {
  @ManyToOne(() => Property, (p) => p.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'propertyId' })
  property: Property;

  @Index()
  @Column({ type: 'uuid' })
  propertyId: string;

  @Exclude()
  @Column({ length: 255 })
  storageKey: string;

  @Column({ length: 255 })
  originalName: string;

  @Column({ length: 60 })
  mimeType: string;

  @Column({ type: 'int' })
  sizeBytes: number;

  /** 0 is the cover image. */
  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  /** Public URL path; property photos are listing material, not private. */
  @Expose()
  get url(): string {
    // storageKey is "property-images/<uuid>.<ext>"
    return `/api/files/${this.storageKey}`;
  }
}
