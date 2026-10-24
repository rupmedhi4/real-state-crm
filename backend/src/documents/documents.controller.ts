import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
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
import { DocumentQueryDto, UploadDocumentDto } from './documents.dto';
import { DocumentsService } from './documents.service';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  findAll(@Query() query: DocumentQueryDto) {
    return this.documents.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.documents.findOne(id);
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.documents.upload(file, dto, user);
  }

  /** Streams the file to an authenticated user; never exposed publicly. */
  @Get(':id/download')
  async download(@Param('id', ParseUUIDPipe) id: string) {
    const { doc, stream } = await this.documents.open(id);
    return new StreamableFile(stream, {
      type: doc.mimeType,
      disposition: `attachment; filename*=UTF-8''${encodeURIComponent(doc.originalName)}`,
      length: doc.sizeBytes,
    });
  }

  @Delete(':id')
  @Roles(...MANAGERS)
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.documents.remove(id);
  }
}
