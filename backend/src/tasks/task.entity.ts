import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Contact } from '../contacts/contact.entity';
import { User } from '../users/user.entity';

@Entity('tasks')
export class Task extends BaseEntity {
  @Column({ length: 200 })
  title: string;

  @ManyToOne(() => Contact, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contactId' })
  contact: Contact | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  contactId: string | null;

  @Column({ length: 30, default: 'Call' })
  type: string;

  @Column({ length: 10, default: 'Medium' })
  priority: string;

  @Index()
  @Column({ type: 'date', nullable: true })
  dueDate: string | null;

  @Column({ type: 'varchar', length: 5, nullable: true })
  dueTime: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigneeId' })
  assignee: User | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  assigneeId: string | null;

  @Index()
  @Column({ length: 20, default: 'Pending' })
  status: string;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
