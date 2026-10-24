import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { uploadModule } from '../storage/upload.config';
import {
  PropertiesController,
  PropertyImageFilesController,
} from './properties.controller';
import { PropertiesService } from './properties.service';
import { PropertyImage } from './property-image.entity';
import { Property } from './property.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Property, PropertyImage]),
    uploadModule('MAX_IMAGE_SIZE_MB', 5),
  ],
  controllers: [PropertiesController, PropertyImageFilesController],
  providers: [PropertiesService],
})
export class PropertiesModule {}
