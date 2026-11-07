import { TenantRepositoriesModule } from '../tenancy/tenancy.module';
import { Module } from '@nestjs/common';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';

@Module({
  imports: [TenantRepositoriesModule.forFeature([])],
  controllers: [AgentsController],
  providers: [AgentsService],
})
export class AgentsModule {}
