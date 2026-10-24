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
  CampaignQueryDto,
  CreateCampaignDto,
  UpdateCampaignDto,
} from './marketing.dto';
import { MarketingService } from './marketing.service';

@ApiTags('Marketing')
@ApiBearerAuth()
@Controller('marketing')
export class MarketingController {
  constructor(private readonly marketing: MarketingService) {}

  @Get('sources')
  sources() {
    return this.marketing.sourcePerformance();
  }

  @Get('campaigns')
  findAll(@Query() query: CampaignQueryDto) {
    return this.marketing.findAll(query);
  }

  @Get('campaigns/options')
  options() {
    return this.marketing.options();
  }

  @Get('campaigns/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.marketing.findOne(id);
  }

  @Post('campaigns')
  @Roles(...MANAGERS)
  create(@Body() dto: CreateCampaignDto) {
    return this.marketing.create(dto);
  }

  @Patch('campaigns/:id')
  @Roles(...MANAGERS)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.marketing.update(id, dto);
  }

  @Delete('campaigns/:id')
  @Roles(...MANAGERS)
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.marketing.remove(id);
  }
}
