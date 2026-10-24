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
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { MANAGERS } from '../common/guards';
import {
  AssignContactDto,
  BulkAssignDto,
  ContactQueryDto,
  ContactStageDto,
  CreateContactDto,
  DuplicateQueryDto,
  UpdateContactDto,
} from './contacts.dto';
import { ContactsService } from './contacts.service';

/** Leads and clients. Clients are contacts filtered with `clientsOnly=true`. */
@ApiTags('Contacts (Leads & Clients)')
@ApiBearerAuth()
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Get()
  findAll(@Query() query: ContactQueryDto) {
    return this.contacts.findAll(query);
  }

  @Get('options')
  options() {
    return this.contacts.options();
  }

  @Get('duplicates')
  duplicates(@Query() query: DuplicateQueryDto) {
    return this.contacts.findDuplicates(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.contacts.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateContactDto, @CurrentUser() user: AuthUser) {
    return this.contacts.create(dto, user);
  }

  @Post('bulk-assign')
  @Roles(...MANAGERS)
  bulkAssign(@Body() dto: BulkAssignDto, @CurrentUser() user: AuthUser) {
    return this.contacts.bulkAssign(dto.ids, dto.agentId, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.contacts.update(id, dto, user);
  }

  @Patch(':id/stage')
  changeStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ContactStageDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.contacts.changeStage(id, dto.stage, user);
  }

  @Patch(':id/assign')
  @Roles(...MANAGERS)
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignContactDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.contacts.assign(id, dto.agentId, user);
  }

  @Delete(':id')
  @Roles(...MANAGERS)
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.contacts.remove(id);
  }

  @Post(':id/photo')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  setPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.contacts.setPhoto(id, file);
  }

  @Get(':id/photo')
  async photo(@Param('id', ParseUUIDPipe) id: string) {
    const { stream, type } = await this.contacts.readPhoto(id);
    return new StreamableFile(stream, { type });
  }

  @Delete(':id/photo')
  @HttpCode(204)
  removePhoto(@Param('id', ParseUUIDPipe) id: string) {
    return this.contacts.removePhoto(id);
  }
}
