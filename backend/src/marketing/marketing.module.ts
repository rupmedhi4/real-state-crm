import { Module } from '@nestjs/common';
import { TenantRepositoriesModule } from '../tenancy/tenancy.module';
import { Campaign } from './campaign.entity';
import { MarketingController } from './marketing.controller';
import { MarketingService } from './marketing.service';

@Module({
  imports: [TenantRepositoriesModule.forFeature([Campaign])],
  controllers: [MarketingController],
  providers: [MarketingService],
})
export class MarketingModule {}
