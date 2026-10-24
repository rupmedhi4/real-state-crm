import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository } from 'typeorm';
import { localToday } from '../common/dates';
import { AuthUser } from '../common/decorators';
import { likeTerm, paginate } from '../common/pagination';
import { Task } from '../tasks/task.entity';
import { CreateVisitDto, UpdateVisitDto, VisitQueryDto } from './visits.dto';
import { Visit } from './visit.entity';

const today = localToday;

function dayAfter(date: string) {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class VisitsService {
  constructor(
    @InjectRepository(Visit) private readonly repo: Repository<Visit>,
    private readonly dataSource: DataSource,
  ) {}

  private baseQuery() {
    return this.repo
      .createQueryBuilder('v')
      .leftJoin('v.contact', 'contact')
      .addSelect(['contact.id', 'contact.name', 'contact.phone'])
      .leftJoin('v.property', 'property')
      .addSelect(['property.id', 'property.title', 'property.locality'])
      .leftJoin('v.agent', 'agent')
      .addSelect(['agent.id', 'agent.name']);
  }

  findAll(query: VisitQueryDto) {
    const qb = this.baseQuery();
    if (query.search) {
      qb.andWhere(
        new Brackets((w) =>
          w.where('contact.name ILIKE :s').orWhere('property.title ILIKE :s'),
        ),
        { s: likeTerm(query.search) },
      );
    }
    if (query.status)
      qb.andWhere('v.status = :status', { status: query.status });
    if (query.agentId)
      qb.andWhere('v.agentId = :agentId', { agentId: query.agentId });
    if (query.contactId) {
      qb.andWhere('v.contactId = :contactId', { contactId: query.contactId });
    }
    if (query.propertyId) {
      qb.andWhere('v.propertyId = :propertyId', {
        propertyId: query.propertyId,
      });
    }
    if (query.when === 'upcoming') {
      qb.andWhere('v.visitDate >= :today', { today: today() }).andWhere(
        "v.status IN ('Scheduled','Confirmed','Rescheduled')",
      );
    }
    if (query.when === 'past')
      qb.andWhere('v.visitDate < :today', { today: today() });
    if (query.from) qb.andWhere('v.visitDate >= :from', { from: query.from });
    if (query.to) qb.andWhere('v.visitDate <= :to', { to: query.to });

    // Upcoming lists read best soonest-first.
    if (!query.sortBy && query.when === 'upcoming') {
      query.sortBy = 'visitDate';
      query.sortOrder ??= 'ASC';
    }
    return paginate(
      qb,
      query,
      {
        visitDate: 'v.visitDate',
        createdAt: 'v.createdAt',
        status: 'v.status',
      },
      'visitDate',
    );
  }

  async findOne(id: string) {
    const visit = await this.baseQuery().where('v.id = :id', { id }).getOne();
    if (!visit) throw new NotFoundException('Site visit not found');
    return visit;
  }

  async create(dto: CreateVisitDto, actor: AuthUser) {
    const { createFollowupTask, ...data } = dto;
    const id = await this.dataSource.transaction(async (em) => {
      const visit = await em.save(
        em.create(Visit, { ...data, agentId: data.agentId ?? actor.id }),
      );
      if (createFollowupTask) {
        await em.save(
          em.create(Task, {
            title: 'Follow up after site visit',
            contactId: visit.contactId,
            type: 'Follow-up',
            priority: 'High',
            dueDate: dayAfter(visit.visitDate),
            assigneeId: visit.agentId,
            status: 'Pending',
          }),
        );
      }
      return visit.id;
    });
    return this.findOne(id);
  }

  async update(id: string, dto: UpdateVisitDto) {
    await this.findOne(id);
    const data = { ...dto };
    delete data.createFollowupTask; // only meaningful when creating
    await this.repo.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.repo.delete(id);
  }
}
