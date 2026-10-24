import { MulterModule } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { memoryStorage } from 'multer';

/**
 * Multer setup for a feature module. Files are buffered in memory (bounded by
 * the size limit) so their content can be checked before anything is written
 * to storage.
 */
export function uploadModule(sizeEnvKey: string, defaultMb: number) {
  return MulterModule.registerAsync({
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
      storage: memoryStorage(),
      limits: {
        fileSize: Number(config.get(sizeEnvKey, defaultMb)) * 1024 * 1024,
        files: 20,
      },
    }),
  });
}
