import { Module } from '@nestjs/common';
import { TenantRepositoriesModule } from '../tenancy/tenancy.module';
import { Visit } from './visit.entity';
import { VisitsController } from './visits.controller';
import { VisitsService } from './visits.service';

@Module({
  imports: [TenantRepositoriesModule.forFeature([Visit])],
  controllers: [VisitsController],
  providers: [VisitsService],
})
export class VisitsModule {}
