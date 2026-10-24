import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { createReadStream } from 'fs';
import { access, mkdir, unlink, writeFile } from 'fs/promises';
import { join, resolve, sep } from 'path';
import { Readable } from 'stream';
import { KEY_PATTERN, StorageService, StoredFile } from './storage.service';

/** Development storage: files on local disk under UPLOAD_DIR. */
@Injectable()
export class LocalStorageService extends StorageService {
  private readonly root: string;

  constructor(config: ConfigService) {
    super();
    this.root = resolve(config.get<string>('UPLOAD_DIR', './uploads'));
  }

  async save(
    folder: string,
    buffer: Buffer,
    extension: string,
  ): Promise<StoredFile> {
    const key = `${folder}/${randomUUID()}.${extension}`;
    const path = this.pathFor(key);
    await mkdir(join(this.root, folder), { recursive: true });
    await writeFile(path, buffer);
    return { key, size: buffer.length };
  }

  async read(key: string): Promise<Readable> {
    const path = this.pathFor(key);
    try {
      await access(path);
    } catch {
      throw new NotFoundException('File not found');
    }
    return createReadStream(path);
  }

  async remove(key: string): Promise<void> {
    try {
      await unlink(this.pathFor(key));
    } catch {
      // already gone
    }
  }

  /** Resolves a key to a path, refusing anything that escapes the root. */
  private pathFor(key: string): string {
    if (!KEY_PATTERN.test(key))
      throw new BadRequestException('Invalid file key');
    const path = resolve(this.root, key);
    if (!path.startsWith(this.root + sep)) {
      throw new BadRequestException('Invalid file key');
    }
    return path;
  }
}
