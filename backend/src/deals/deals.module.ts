import { Module } from '@nestjs/common';
import { TenantRepositoriesModule } from '../tenancy/tenancy.module';
import { Deal } from './deal.entity';
import { DealsController } from './deals.controller';
import { DealsService } from './deals.service';

@Module({
  imports: [TenantRepositoriesModule.forFeature([Deal])],
  controllers: [DealsController],
  providers: [DealsService],
})
export class DealsModule {}
