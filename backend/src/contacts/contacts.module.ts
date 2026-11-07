import { Module } from '@nestjs/common';
import { TenantRepositoriesModule } from '../tenancy/tenancy.module';
import { Activity } from '../communications/activity.entity';
import { uploadModule } from '../storage/upload.config';
import { Contact } from './contact.entity';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';

@Module({
  imports: [
    TenantRepositoriesModule.forFeature([Contact, Activity]),
    uploadModule('MAX_IMAGE_SIZE_MB', 5),
  ],
  controllers: [ContactsController],
  providers: [ContactsService],
})
export class ContactsModule {}
