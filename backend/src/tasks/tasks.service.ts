import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { localToday } from '../common/dates';
import { AuthUser } from '../common/decorators';
import { likeTerm, paginate } from '../common/pagination';
import { CreateTaskDto, TaskQueryDto, UpdateTaskDto } from './tasks.dto';
import { Task } from './task.entity';

const today = localToday;

function applyBucket(qb: SelectQueryBuilder<Task>, bucket: string) {
  const t = today();
  if (bucket === 'completed') qb.andWhere("t.status = 'Completed'");
  else {
    qb.andWhere("t.status != 'Completed'");
    if (bucket === 'overdue') qb.andWhere('t.dueDate < :t', { t });
    if (bucket === 'today') qb.andWhere('t.dueDate = :t', { t });
    if (bucket === 'upcoming') qb.andWhere('t.dueDate > :t', { t });
  }
}

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private readonly repo: Repository<Task>,
  ) {}

  private baseQuery() {
    return this.repo
      .createQueryBuilder('t')
      .leftJoin('t.contact', 'contact')
      .addSelect(['contact.id', 'contact.name', 'contact.phone'])
      .leftJoin('t.assignee', 'assignee')
      .addSelect(['assignee.id', 'assignee.name']);
  }

  findAll(query: TaskQueryDto, user: AuthUser) {
    const qb = this.baseQuery();
    if (query.search) {
      qb.andWhere(
        new Brackets((w) =>
          w.where('t.title ILIKE :s').orWhere('contact.name ILIKE :s'),
        ),
        { s: likeTerm(query.search) },
      );
    }
    if (query.bucket) applyBucket(qb, query.bucket);
    if (query.status)
      qb.andWhere('t.status = :status', { status: query.status });
    if (query.priority) {
      qb.andWhere('t.priority = :priority', { priority: query.priority });
    }
    if (query.assigneeId) {
      qb.andWhere('t.assigneeId = :aid', {
        aid: query.assigneeId === 'me' ? user.id : query.assigneeId,
      });
    }
    if (query.contactId) {
      qb.andWhere('t.contactId = :contactId', { contactId: query.contactId });
    }
    if (!query.sortBy) {
      query.sortBy = 'dueDate';
      query.sortOrder ??= 'ASC';
    }
    return paginate(
      qb,
      query,
      {
        dueDate: 't.dueDate',
        createdAt: 't.createdAt',
        priority: 't.priority',
        title: 't.title',
      },
      'dueDate',
    );
  }

  /** Open-task counts per bucket, for the tab labels. */
  async counts(user: AuthUser, assigneeId?: string) {
    const result: Record<string, number> = {};
    for (const bucket of ['overdue', 'today', 'upcoming', 'completed']) {
      const qb = this.repo.createQueryBuilder('t');
      applyBucket(qb, bucket);
      if (assigneeId) {
        qb.andWhere('t.assigneeId = :aid', {
          aid: assigneeId === 'me' ? user.id : assigneeId,
        });
      }
      result[bucket] = await qb.getCount();
    }
    return result;
  }

  async findOne(id: string) {
    const task = await this.baseQuery().where('t.id = :id', { id }).getOne();
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async create(dto: CreateTaskDto, actor: AuthUser) {
    const task = this.repo.create({
      ...dto,
      assigneeId: dto.assigneeId === undefined ? actor.id : dto.assigneeId,
    });
    if (task.status === 'Completed') task.completedAt = new Date();
    const saved = await this.repo.save(task);
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateTaskDto) {
    const task = await this.findOne(id);
    const patch: Partial<Task> = { ...dto };
    if (dto.status && dto.status !== task.status) {
      patch.completedAt = dto.status === 'Completed' ? new Date() : null;
    }
    await this.repo.update(id, patch);
    return this.findOne(id);
  }

  complete(id: string) {
    return this.update(id, { status: 'Completed' });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.repo.delete(id);
  }
}
