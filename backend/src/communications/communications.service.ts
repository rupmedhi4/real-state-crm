import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { AuthUser } from '../common/decorators';
import { likeTerm, paginate } from '../common/pagination';
import {
  ActivityQueryDto,
  CreateActivityDto,
  UpdateActivityDto,
} from './communications.dto';
import { Activity } from './activity.entity';

@Injectable()
export class CommunicationsService {
  constructor(
    @InjectRepository(Activity) private readonly repo: Repository<Activity>,
  ) {}

  private baseQuery() {
    return this.repo
      .createQueryBuilder('a')
      .leftJoin('a.contact', 'contact')
      .addSelect(['contact.id', 'contact.name', 'contact.phone'])
      .leftJoin('a.agent', 'agent')
      .addSelect(['agent.id', 'agent.name']);
  }

  findAll(query: ActivityQueryDto) {
    const qb = this.baseQuery();
    if (query.search) {
      qb.andWhere(
        new Brackets((w) =>
          w.where('a.notes ILIKE :s').orWhere('contact.name ILIKE :s'),
        ),
        { s: likeTerm(query.search) },
      );
    }
    if (query.type) qb.andWhere('a.type = :type', { type: query.type });
    if (query.contactId) {
      qb.andWhere('a.contactId = :contactId', { contactId: query.contactId });
    }
    if (query.agentId)
      qb.andWhere('a.agentId = :agentId', { agentId: query.agentId });
    return paginate(
      qb,
      query,
      { occurredAt: 'a.occurredAt', type: 'a.type' },
      'occurredAt',
    );
  }

  async findOne(id: string) {
    const activity = await this.baseQuery()
      .where('a.id = :id', { id })
      .getOne();
    if (!activity) throw new NotFoundException('Activity not found');
    return activity;
  }

  async create(dto: CreateActivityDto, actor: AuthUser) {
    const saved = await this.repo.save(
      this.repo.create({
        ...dto,
        agentId: dto.agentId === undefined ? actor.id : dto.agentId,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
      }),
    );
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateActivityDto) {
    await this.findOne(id);
    const { occurredAt, ...rest } = dto;
    await this.repo.update(id, {
      ...rest,
      ...(occurredAt ? { occurredAt: new Date(occurredAt) } : {}),
    });
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.repo.delete(id);
  }
}
