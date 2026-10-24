import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { numericTransformer } from '../common/transformers';

@Entity('campaigns')
export class Campaign extends BaseEntity {
  @Column({ length: 150 })
  name: string;

  /** Lead source / channel the campaign runs on, e.g. "Google Ads". */
  @Column({ length: 60 })
  source: string;

  @Column({ type: 'date', nullable: true })
  startDate: string | null;

  @Column({ type: 'date', nullable: true })
  endDate: string | null;

  @Column({
    type: 'bigint',
    nullable: true,
    transformer: numericTransformer,
  })
  budget: number | null;

  @Column({ length: 20, default: 'Active' })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
