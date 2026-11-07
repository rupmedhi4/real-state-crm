import { Module } from '@nestjs/common';
import { TenantRepositoriesModule } from '../tenancy/tenancy.module';
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
    TenantRepositoriesModule.forFeature([Property, PropertyImage]),
    uploadModule('MAX_IMAGE_SIZE_MB', 5),
  ],
  controllers: [PropertiesController, PropertyImageFilesController],
  providers: [PropertiesService],
})
export class PropertiesModule {}
