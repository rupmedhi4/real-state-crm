import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { likeTerm, paginate } from '../common/pagination';
import { CreateDealDto, DealQueryDto, UpdateDealDto } from './deals.dto';
import { Deal } from './deal.entity';

const CLOSED = ['Won', 'Lost'];

@Injectable()
export class DealsService {
  constructor(
    @InjectRepository(Deal) private readonly repo: Repository<Deal>,
  ) {}

  private baseQuery() {
    return this.repo
      .createQueryBuilder('d')
      .leftJoin('d.contact', 'contact')
      .addSelect(['contact.id', 'contact.name', 'contact.phone'])
      .leftJoin('d.property', 'property')
      .addSelect(['property.id', 'property.title', 'property.locality'])
      .leftJoin('d.agent', 'agent')
      .addSelect(['agent.id', 'agent.name']);
  }

  findAll(query: DealQueryDto) {
    const qb = this.baseQuery();
    if (query.search) {
      qb.andWhere(
        new Brackets((w) =>
          w
            .where('d.title ILIKE :s')
            .orWhere('contact.name ILIKE :s')
            .orWhere('property.title ILIKE :s'),
        ),
        { s: likeTerm(query.search) },
      );
    }
    if (query.stage) qb.andWhere('d.stage = :stage', { stage: query.stage });
    if (query.transactionStatus) {
      qb.andWhere('d.transactionStatus = :ts', { ts: query.transactionStatus });
    }
    if (query.agentId)
      qb.andWhere('d.agentId = :agentId', { agentId: query.agentId });
    if (query.contactId) {
      qb.andWhere('d.contactId = :contactId', { contactId: query.contactId });
    }
    if (query.propertyId) {
      qb.andWhere('d.propertyId = :propertyId', {
        propertyId: query.propertyId,
      });
    }
    if (query.status === 'open')
      qb.andWhere('d.stage NOT IN (:...closed)', { closed: CLOSED });
    if (query.status === 'won') qb.andWhere("d.stage = 'Won'");
    if (query.status === 'lost') qb.andWhere("d.stage = 'Lost'");

    return paginate(
      qb,
      query,
      {
        createdAt: 'd.createdAt',
        value: 'd.value',
        expectedClosing: 'd.expectedClosing',
        stage: 'd.stage',
        probability: 'd.probability',
      },
      'createdAt',
    );
  }

  /** Pipeline value, weighted value, win/loss counts and revenue. */
  async summary() {
    const row = await this.repo
      .createQueryBuilder('d')
      .select(
        `COALESCE(SUM(d.value) FILTER (WHERE d.stage NOT IN ('Won','Lost')), 0)`,
        'pipelineValue',
      )
      .addSelect(
        `COALESCE(SUM(d.value * d.probability / 100.0) FILTER (WHERE d.stage NOT IN ('Won','Lost')), 0)`,
        'weightedValue',
      )
      .addSelect(`COUNT(*) FILTER (WHERE d.stage = 'Won')`, 'won')
      .addSelect(`COUNT(*) FILTER (WHERE d.stage = 'Lost')`, 'lost')
      .addSelect(
        `COUNT(*) FILTER (WHERE d.stage NOT IN ('Won','Lost'))`,
        'open',
      )
      .addSelect(`COUNT(*)`, 'total')
      .addSelect(
        `COALESCE(SUM(d.value) FILTER (WHERE d.stage = 'Won'), 0)`,
        'revenue',
      )
      .addSelect(
        `COALESCE(SUM(d.value * d."commissionPct" / 100.0) FILTER (WHERE d.stage = 'Won'), 0)`,
        'commission',
      )
      .getRawOne<Record<string, string>>();
    const n = (k: string) => Math.round(Number(row?.[k] ?? 0));
    const closed = n('won') + n('lost');
    return {
      pipelineValue: n('pipelineValue'),
      weightedValue: n('weightedValue'),
      open: n('open'),
      won: n('won'),
      lost: n('lost'),
      total: n('total'),
      winRate: closed ? Math.round((n('won') / closed) * 100) : 0,
      revenue: n('revenue'),
      commissionEarned: n('commission'),
    };
  }

  async findOne(id: string) {
    const deal = await this.baseQuery().where('d.id = :id', { id }).getOne();
    if (!deal) throw new NotFoundException('Deal not found');
    return deal;
  }

  async create(dto: CreateDealDto) {
    const deal = this.repo.create(dto);
    if (deal.stage && CLOSED.includes(deal.stage)) deal.closedAt = new Date();
    const saved = await this.repo.save(deal);
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateDealDto) {
    const deal = await this.findOne(id);
    const patch: Partial<Deal> = { ...dto };
    if (dto.stage && dto.stage !== deal.stage) {
      patch.closedAt = CLOSED.includes(dto.stage) ? new Date() : null;
    }
    await this.repo.update(id, patch);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.repo.delete(id);
  }
}
