import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { likeTerm, paginate } from '../common/pagination';
import { Campaign } from './campaign.entity';
import {
  CampaignQueryDto,
  CreateCampaignDto,
  UpdateCampaignDto,
} from './marketing.dto';

// A lead counts as qualified once it moves past the first two stages.
const QUALIFIED_SQL = `c.stage NOT IN ('New','Contacted','Lost')`;

interface PerfRow {
  key: string;
  leads: string;
  qualified: string;
  won: string;
  revenue: string;
}

@Injectable()
export class MarketingService {
  constructor(
    @InjectRepository(Campaign) private readonly repo: Repository<Campaign>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: CampaignQueryDto) {
    const qb = this.repo.createQueryBuilder('cp');
    if (query.search) {
      qb.andWhere('cp.name ILIKE :s', { s: likeTerm(query.search) });
    }
    if (query.status)
      qb.andWhere('cp.status = :status', { status: query.status });
    if (query.source)
      qb.andWhere('cp.source = :source', { source: query.source });
    const page = await paginate(
      qb,
      query,
      {
        name: 'cp.name',
        startDate: 'cp.startDate',
        createdAt: 'cp.createdAt',
        budget: 'cp.budget',
      },
      'createdAt',
    );

    // Attach performance numbers for the campaigns on this page.
    const perf = await this.performanceBy('c."campaignId"');
    const items = page.items.map((cp) => {
      const p = perf.get(cp.id) ?? {
        leads: 0,
        qualified: 0,
        won: 0,
        revenue: 0,
        conversion: 0,
      };
      return {
        ...cp,
        ...p,
        costPerLead:
          cp.budget && p.leads ? Math.round(cp.budget / p.leads) : null,
      };
    });
    return { ...page, items };
  }

  options() {
    return this.repo.find({
      select: { id: true, name: true, source: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string) {
    const campaign = await this.repo.findOne({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async create(dto: CreateCampaignDto) {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: string, dto: UpdateCampaignDto) {
    await this.findOne(id);
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.repo.delete(id); // contacts keep existing, campaignId -> NULL
  }

  /** Leads, qualified leads, won deals and conversion for every lead source. */
  async sourcePerformance() {
    const perf = await this.performanceBy('c.source');
    return [...perf.entries()]
      .map(([source, p]) => ({ source, ...p }))
      .sort((a, b) => b.leads - a.leads);
  }

  private async performanceBy(groupExpr: string) {
    const rows: PerfRow[] = await this.dataSource.query(`
      SELECT ${groupExpr} AS key,
             COUNT(*) AS leads,
             COUNT(*) FILTER (WHERE ${QUALIFIED_SQL}) AS qualified,
             COALESCE(SUM(w.won), 0) AS won,
             COALESCE(SUM(w.revenue), 0) AS revenue
      FROM contacts c
      LEFT JOIN (
        SELECT "contactId", COUNT(*) AS won, SUM(value) AS revenue
        FROM deals WHERE stage = 'Won' GROUP BY "contactId"
      ) w ON w."contactId" = c.id
      WHERE ${groupExpr} IS NOT NULL
      GROUP BY ${groupExpr}
    `);
    const map = new Map<
      string,
      {
        leads: number;
        qualified: number;
        won: number;
        revenue: number;
        conversion: number;
      }
    >();
    for (const r of rows) {
      const leads = Number(r.leads);
      const won = Number(r.won);
      map.set(r.key, {
        leads,
        qualified: Number(r.qualified),
        won,
        revenue: Number(r.revenue),
        conversion: leads ? Math.round((won / leads) * 100) : 0,
      });
    }
    return map;
  }
}
