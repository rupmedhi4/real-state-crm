import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import { KEY_PATTERN, StorageService, StoredFile } from './storage.service';

/**
 * Object storage through the S3 API. Works with AWS S3, Cloudflare R2,
 * Supabase Storage and other S3-compatible providers via S3_ENDPOINT.
 */
@Injectable()
export class S3StorageService extends StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: ConfigService) {
    super();
    const endpoint = config.get<string>('S3_ENDPOINT') || undefined;
    this.bucket = config.getOrThrow<string>('S3_BUCKET');
    this.client = new S3Client({
      region: config.get<string>('S3_REGION', 'auto'),
      endpoint,
      // Custom endpoints (R2, Supabase, MinIO) expect path-style URLs.
      forcePathStyle: !!endpoint,
      credentials: {
        accessKeyId: config.getOrThrow<string>('S3_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow<string>('S3_SECRET_ACCESS_KEY'),
      },
    });
  }

  async save(
    folder: string,
    buffer: Buffer,
    extension: string,
  ): Promise<StoredFile> {
    const key = `${folder}/${randomUUID()}.${extension}`;
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: buffer }),
    );
    return { key, size: buffer.length };
  }

  async read(key: string): Promise<Readable> {
    this.checkKey(key);
    try {
      const res = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return res.Body as Readable;
    } catch (err) {
      if (err instanceof NoSuchKey)
        throw new NotFoundException('File not found');
      throw err;
    }
  }

  async remove(key: string): Promise<void> {
    this.checkKey(key);
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch {
      // already gone, or the store is unreachable; not worth failing the request
    }
  }

  private checkKey(key: string) {
    if (!KEY_PATTERN.test(key))
      throw new BadRequestException('Invalid file key');
  }
}
