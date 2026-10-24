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
import { AuthUser, CurrentUser } from '../common/decorators';
import { CreateVisitDto, UpdateVisitDto, VisitQueryDto } from './visits.dto';
import { VisitsService } from './visits.service';

@ApiTags('Site Visits')
@ApiBearerAuth()
@Controller('visits')
export class VisitsController {
  constructor(private readonly visits: VisitsService) {}

  @Get()
  findAll(@Query() query: VisitQueryDto) {
    return this.visits.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.visits.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateVisitDto, @CurrentUser() user: AuthUser) {
    return this.visits.create(dto, user);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateVisitDto) {
    return this.visits.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.visits.remove(id);
  }
}
