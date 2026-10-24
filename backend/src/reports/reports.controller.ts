import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';

@ApiTags('Reports & Dashboard')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('dashboard')
  dashboard() {
    return this.reports.dashboard();
  }

  @Get('lead-status')
  leadStatus() {
    return this.reports.leadStatus();
  }

  @Get('funnel')
  funnel() {
    return this.reports.funnel();
  }

  @Get('revenue')
  revenue(
    @Query('months', new DefaultValuePipe(12), ParseIntPipe) months: number,
  ) {
    return this.reports.revenueByMonth(Math.min(Math.max(months, 1), 36));
  }

  @Get('visits')
  visits() {
    return this.reports.visitOutcomes();
  }

  @Get('inventory')
  inventory() {
    return this.reports.propertyInventory();
  }
}
