import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, In, Repository } from 'typeorm';
import { Activity } from '../communications/activity.entity';
import { CLIENT_STAGES, Role } from '../common/constants';
import { Deal } from '../deals/deal.entity';
import { localToday } from '../common/dates';
import { AuthUser } from '../common/decorators';
import { likeTerm, paginate } from '../common/pagination';
import { validateUpload, IMAGE_TYPES } from '../storage/file-validation';
import { StorageService } from '../storage/storage.service';
import { User } from '../users/user.entity';
import { Contact } from './contact.entity';
import {
  ContactQueryDto,
  CreateContactDto,
  DuplicateQueryDto,
  UpdateContactDto,
} from './contacts.dto';

const today = localToday;

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact) private readonly repo: Repository<Contact>,
    @InjectRepository(Activity)
    private readonly activities: Repository<Activity>,
    private readonly dataSource: DataSource,
    private readonly storage: StorageService,
  ) {}

  findAll(query: ContactQueryDto) {
    const qb = this.repo
      .createQueryBuilder('c')
      .leftJoin('c.agent', 'agent')
      .addSelect(['agent.id', 'agent.name'])
      .leftJoin('c.campaign', 'campaign')
      .addSelect(['campaign.id', 'campaign.name']);

    if (query.search) {
      qb.andWhere(
        new Brackets((w) =>
          w
            .where('c.name ILIKE :s')
            .orWhere('c.phone ILIKE :s')
            .orWhere('c.email ILIKE :s')
            .orWhere('c.city ILIKE :s')
            .orWhere('c.propertyInterest ILIKE :s'),
        ),
        { s: likeTerm(query.search) },
      );
    }
    if (query.stage) qb.andWhere('c.stage = :stage', { stage: query.stage });
    if (query.source)
      qb.andWhere('c.source = :source', { source: query.source });
    if (query.priority) {
      qb.andWhere('c.priority = :priority', { priority: query.priority });
    }
    if (query.agentId === 'unassigned') qb.andWhere('c.agentId IS NULL');
    else if (query.agentId) {
      qb.andWhere('c.agentId = :agentId', { agentId: query.agentId });
    }
    if (query.campaignId) {
      qb.andWhere('c.campaignId = :campaignId', {
        campaignId: query.campaignId,
      });
    }
    if (query.clientsOnly) {
      qb.andWhere('c.stage IN (:...clientStages)', {
        clientStages: CLIENT_STAGES,
      });
    }
    if (query.followupDue) {
      qb.andWhere('c.nextFollowup <= :today', { today: today() });
    }

    return paginate(
      qb,
      query,
      {
        name: 'c.name',
        createdAt: 'c.createdAt',
        updatedAt: 'c.updatedAt',
        stage: 'c.stage',
        source: 'c.source',
        budgetMax: 'c.budgetMax',
        nextFollowup: 'c.nextFollowup',
        priority: 'c.priority',
        score: 'c.score',
      },
      'createdAt',
    );
  }

  /** All contacts as {id, name} for select inputs. */
  options() {
    return this.repo.find({
      select: { id: true, name: true, phone: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string) {
    const contact = await this.repo.findOne({
      where: { id },
      relations: { agent: true, campaign: true },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  findDuplicates(q: DuplicateQueryDto) {
    if (!q.phone && !q.email) return Promise.resolve([]);
    const qb = this.repo
      .createQueryBuilder('c')
      .select(['c.id', 'c.name', 'c.phone', 'c.email']);
    qb.where(
      new Brackets((w) => {
        if (q.phone) w.orWhere('c.phone = :phone', { phone: q.phone.trim() });
        if (q.email) {
          w.orWhere('LOWER(c.email) = LOWER(:email)', {
            email: q.email.trim(),
          });
        }
      }),
    );
    if (q.excludeId) qb.andWhere('c.id != :id', { id: q.excludeId });
    return qb.limit(5).getMany();
  }

  async create(dto: CreateContactDto, actor: AuthUser) {
    const { note, ...data } = dto;
    // Agents create leads for themselves unless they pick someone else.
    const contact = this.repo.create({
      ...data,
      agentId: data.agentId === undefined ? actor.id : data.agentId,
    });
    return this.dataSource.transaction(async (em) => {
      const saved = await em.save(contact);
      if (note) {
        await em.save(
          em.create(Activity, {
            contactId: saved.id,
            type: 'Note',
            notes: note,
            agentId: actor.id,
          }),
        );
      }
      return em.findOneOrFail(Contact, {
        where: { id: saved.id },
        relations: { agent: true, campaign: true },
      });
    });
  }

  async update(id: string, dto: UpdateContactDto, actor: AuthUser) {
    const contact = await this.findOne(id);
    const { note, ...data } = dto;

    if (
      data.agentId !== undefined &&
      data.agentId !== contact.agentId &&
      actor.role === Role.AGENT
    ) {
      throw new ForbiddenException('Only managers can reassign leads');
    }

    const log: Partial<Activity>[] = [];
    if (data.stage && data.stage !== contact.stage) {
      log.push({
        type: 'Status Change',
        notes: `Stage changed from ${contact.stage} to ${data.stage}`,
      });
    }
    if (data.agentId !== undefined && data.agentId !== contact.agentId) {
      log.push({
        type: 'Note',
        notes: await this.assignmentNote(data.agentId),
      });
    }
    if (note) log.push({ type: 'Note', notes: note });

    await this.dataSource.transaction(async (em) => {
      await em.update(Contact, id, data);
      for (const entry of log) {
        await em.save(
          em.create(Activity, { ...entry, contactId: id, agentId: actor.id }),
        );
      }
    });
    return this.findOne(id);
  }

  changeStage(id: string, stage: string, actor: AuthUser) {
    return this.update(id, { stage }, actor);
  }

  assign(id: string, agentId: string | null, actor: AuthUser) {
    return this.update(id, { agentId }, actor);
  }

  async bulkAssign(ids: string[], agentId: string | null, actor: AuthUser) {
    const contacts = await this.repo.findBy({ id: In(ids) });
    for (const c of contacts) await this.update(c.id, { agentId }, actor);
    return { updated: contacts.length };
  }

  async remove(id: string) {
    const contact = await this.repo.findOne({
      where: { id },
      select: { id: true, photoKey: true },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    const deals = await this.dataSource
      .getRepository(Deal)
      .countBy({ contactId: id });
    if (deals) {
      throw new ConflictException(
        `This contact has ${deals} deal(s). Delete or reassign them first.`,
      );
    }
    await this.repo.delete(id);
    if (contact.photoKey) await this.storage.remove(contact.photoKey);
  }

  async setPhoto(id: string, file: Express.Multer.File | undefined) {
    const ext = validateUpload(file, IMAGE_TYPES);
    const contact = await this.repo.findOne({
      where: { id },
      select: { id: true, photoKey: true },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    const stored = await this.storage.save('contact-photos', file!.buffer, ext);
    await this.repo.update(id, { photoKey: stored.key, hasPhoto: true });
    if (contact.photoKey) await this.storage.remove(contact.photoKey);
    return this.findOne(id);
  }

  async removePhoto(id: string) {
    const contact = await this.repo.findOne({
      where: { id },
      select: { id: true, photoKey: true },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    await this.repo.update(id, { photoKey: null, hasPhoto: false });
    if (contact.photoKey) await this.storage.remove(contact.photoKey);
  }

  async readPhoto(id: string) {
    const contact = await this.repo.findOne({
      where: { id },
      select: { id: true, photoKey: true },
    });
    if (!contact?.photoKey) throw new NotFoundException('No photo');
    const ext = contact.photoKey.split('.').pop();
    const type =
      ext === 'png'
        ? 'image/png'
        : ext === 'webp'
          ? 'image/webp'
          : 'image/jpeg';
    return { stream: await this.storage.read(contact.photoKey), type };
  }

  private async assignmentNote(agentId: string | null) {
    if (!agentId) return 'Lead unassigned';
    const agent = await this.dataSource
      .getRepository(User)
      .findOne({ where: { id: agentId }, select: { id: true, name: true } });
    if (!agent) throw new NotFoundException('Agent not found');
    return `Lead assigned to ${agent.name}`;
  }
}
