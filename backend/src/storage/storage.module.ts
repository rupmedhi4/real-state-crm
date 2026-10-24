import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageService } from './local-storage.service';
import { S3StorageService } from './s3-storage.service';
import { StorageService } from './storage.service';

// STORAGE_DRIVER=s3 stores files in S3-compatible object storage (needed on
// hosts with a temporary disk, like Render); anything else uses local disk.
@Global()
@Module({
  providers: [
    {
      provide: StorageService,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.get('STORAGE_DRIVER') === 's3'
          ? new S3StorageService(config)
          : new LocalStorageService(config),
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
