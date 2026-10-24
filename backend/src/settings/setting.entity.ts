import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** Key/value CRM configuration (company profile, defaults, etc.). */
@Entity('settings')
export class Setting {
  @PrimaryColumn({ length: 60 })
  key: string;

  @Column({ type: 'jsonb' })
  value: unknown;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
