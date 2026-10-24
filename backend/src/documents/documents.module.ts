import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { uploadModule } from '../storage/upload.config';
import { CrmDocument } from './document.entity';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CrmDocument]),
    uploadModule('MAX_DOCUMENT_SIZE_MB', 10),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
