import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Public, Roles } from '../common/decorators';
import { MANAGERS } from '../common/guards';
import {
  CreatePropertyDto,
  PropertyQueryDto,
  ReorderImagesDto,
  UpdatePropertyDto,
} from './properties.dto';
import { PropertiesService } from './properties.service';

@ApiTags('Properties')
@ApiBearerAuth()
@Controller('properties')
export class PropertiesController {
  constructor(private readonly properties: PropertiesService) {}

  @Get()
  findAll(@Query() query: PropertyQueryDto) {
    return this.properties.findAll(query);
  }

  @Get('options')
  options() {
    return this.properties.options();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.properties.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePropertyDto) {
    return this.properties.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePropertyDto,
  ) {
    return this.properties.update(id, dto);
  }

  @Delete(':id')
  @Roles(...MANAGERS)
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.properties.remove(id);
  }

  /** Upload one or more images in the `files` field. */
  @Post(':id/images')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 20))
  addImages(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.properties.addImages(id, files);
  }

  @Put(':id/images/order')
  reorder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderImagesDto,
  ) {
    return this.properties.reorderImages(id, dto.imageIds);
  }

  @Delete(':id/images/:imageId')
  removeImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    return this.properties.removeImage(id, imageId);
  }
}

/**
 * Property photos are public listing material, served without auth so they
 * can be used in <img> tags and shared listings. Keys are random UUIDs and
 * only keys recorded in property_images are served.
 */
@ApiTags('Files')
@Controller('files/property-images')
export class PropertyImageFilesController {
  constructor(private readonly properties: PropertiesService) {}

  @Public()
  @Get(':name')
  @Header('Cache-Control', 'public, max-age=86400')
  async image(@Param('name') name: string) {
    const { stream, type } = await this.properties.readPublicImage(
      `property-images/${name}`,
    );
    return new StreamableFile(stream, { type });
  }
}
