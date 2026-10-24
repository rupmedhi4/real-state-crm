import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AgentsService } from './agents.service';

/** Read-only team performance. Account management lives under /users. */
@ApiTags('Agents & Team')
@ApiBearerAuth()
@Controller('agents')
export class AgentsController {
  constructor(private readonly agents: AgentsService) {}

  @Get()
  stats() {
    return this.agents.stats();
  }
}
