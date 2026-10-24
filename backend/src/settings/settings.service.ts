import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as C from '../common/constants';
import { Setting } from './setting.entity';
import { UpdateSettingsDto } from './settings.dto';

export const DEFAULT_SETTINGS = {
  companyName: 'Estateflow Realty',
  tagline: 'Trusted property partners in Guwahati',
  companyPhone: '',
  companyEmail: '',
  companyAddress: '',
  currency: 'INR',
  dateFormat: 'DD/MM/YYYY',
};

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting) private readonly repo: Repository<Setting>,
  ) {}

  async get() {
    const rows = await this.repo.find();
    const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return { ...DEFAULT_SETTINGS, ...stored };
  }

  async update(dto: UpdateSettingsDto) {
    const entries = Object.entries(
      dto as Record<string, string | undefined>,
    ).filter(([, v]) => v !== undefined);
    await this.repo.save(entries.map(([key, value]) => ({ key, value })));
    return this.get();
  }

  /** Option lists the UI uses for dropdowns and labels. */
  meta() {
    return {
      roles: Object.values(C.Role),
      designations: C.DESIGNATIONS,
      leadStages: C.LEAD_STAGES,
      clientStages: C.CLIENT_STAGES,
      leadSources: C.LEAD_SOURCES,
      priorities: C.PRIORITIES,
      propertyCategories: C.PROPERTY_CATEGORIES,
      intents: C.INTENTS,
      listingTypes: C.LISTING_TYPES,
      propertyTypes: C.PROPERTY_TYPES,
      propertyStatuses: C.PROPERTY_STATUSES,
      dealStages: C.DEAL_STAGES,
      transactionStatuses: C.TRANSACTION_STATUSES,
      visitStatuses: C.VISIT_STATUSES,
      taskTypes: C.TASK_TYPES,
      taskStatuses: C.TASK_STATUSES,
      activityTypes: C.ACTIVITY_TYPES,
      activityOutcomes: C.ACTIVITY_OUTCOMES,
      campaignStatuses: C.CAMPAIGN_STATUSES,
      documentCategories: C.DOCUMENT_CATEGORIES,
    };
  }
}
