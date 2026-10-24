import { Readable } from 'stream';

/** Shape of every key produced by save(): `<folder>/<uuid>.<ext>`. */
export const KEY_PATTERN = /^[a-z0-9-]+\/[0-9a-f-]{36}\.[a-z0-9]{2,5}$/;

export interface StoredFile {
  key: string;
  size: number;
}

/**
 * Abstract file store. The app only depends on this class, so the local-disk
 * implementation can be swapped for S3/GCS/Azure in production without
 * touching the modules that upload or serve files.
 */
export abstract class StorageService {
  /** Saves bytes under `folder` and returns an opaque storage key. */
  abstract save(
    folder: string,
    buffer: Buffer,
    extension: string,
  ): Promise<StoredFile>;

  /** Opens a stored file for streaming. Throws NotFoundException if missing. */
  abstract read(key: string): Promise<Readable>;

  /** Deletes a stored file. Missing files are ignored. */
  abstract remove(key: string): Promise<void>;
}
