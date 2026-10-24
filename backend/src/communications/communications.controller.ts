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
import {
  ActivityQueryDto,
  CreateActivityDto,
  UpdateActivityDto,
} from './communications.dto';
import { CommunicationsService } from './communications.service';

@ApiTags('Communications')
@ApiBearerAuth()
@Controller('activities')
export class CommunicationsController {
  constructor(private readonly comms: CommunicationsService) {}

  @Get()
  findAll(@Query() query: ActivityQueryDto) {
    return this.comms.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.comms.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateActivityDto, @CurrentUser() user: AuthUser) {
    return this.comms.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateActivityDto,
  ) {
    return this.comms.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.comms.remove(id);
  }
}
