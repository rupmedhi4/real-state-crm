import { TenantRepositoriesModule } from '../tenancy/tenancy.module';
import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [TenantRepositoriesModule.forFeature([])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
