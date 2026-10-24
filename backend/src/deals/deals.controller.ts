import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators';
import { MANAGERS } from '../common/guards';
import {
  CreateDealDto,
  DealQueryDto,
  DealStageDto,
  UpdateDealDto,
} from './deals.dto';
import { DealsService } from './deals.service';

@ApiTags('Deals')
@ApiBearerAuth()
@Controller('deals')
export class DealsController {
  constructor(private readonly deals: DealsService) {}

  @Get()
  findAll(@Query() query: DealQueryDto) {
    return this.deals.findAll(query);
  }

  @Get('summary')
  summary() {
    return this.deals.summary();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.deals.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateDealDto) {
    return this.deals.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDealDto) {
    return this.deals.update(id, dto);
  }

  @Patch(':id/stage')
  stage(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DealStageDto) {
    return this.deals.update(id, { stage: dto.stage });
  }

  @Delete(':id')
  @Roles(...MANAGERS)
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.deals.remove(id);
  }
}
