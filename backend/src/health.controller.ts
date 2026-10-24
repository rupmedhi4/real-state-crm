import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { Public } from './common/decorators';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly db: DataSource) {}

  @Public()
  @Get()
  async check() {
    try {
      await this.db.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
    return { status: 'ok', time: new Date().toISOString() };
  }
}
