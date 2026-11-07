import { Module } from '@nestjs/common';
import { TenantRepositoriesModule } from '../tenancy/tenancy.module';
import { uploadModule } from '../storage/upload.config';
import { CrmDocument } from './document.entity';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [
    TenantRepositoriesModule.forFeature([CrmDocument]),
    uploadModule('MAX_DOCUMENT_SIZE_MB', 10),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
