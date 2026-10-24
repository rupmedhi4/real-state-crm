import { BadRequestException } from '@nestjs/common';

interface FileKind {
  ext: string;
  /** Checks the file's leading bytes so a renamed file can't pass as another type. */
  matches: (b: Buffer) => boolean;
}

const startsWith = (b: Buffer, bytes: number[], offset = 0) =>
  bytes.every((v, i) => b[offset + i] === v);

const KINDS: Record<string, FileKind> = {
  'image/jpeg': {
    ext: 'jpg',
    matches: (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  },
  'image/png': {
    ext: 'png',
    matches: (b) =>
      startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  'image/webp': {
    ext: 'webp',
    matches: (b) =>
      startsWith(b, [0x52, 0x49, 0x46, 0x46]) &&
      startsWith(b, [0x57, 0x45, 0x42, 0x50], 8),
  },
  'application/pdf': {
    ext: 'pdf',
    matches: (b) => startsWith(b, [0x25, 0x50, 0x44, 0x46]),
  },
  // Office formats are zip containers (docx/xlsx) or OLE (doc/xls).
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    ext: 'docx',
    matches: (b) => startsWith(b, [0x50, 0x4b, 0x03, 0x04]),
  },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    ext: 'xlsx',
    matches: (b) => startsWith(b, [0x50, 0x4b, 0x03, 0x04]),
  },
  'application/msword': {
    ext: 'doc',
    matches: (b) => startsWith(b, [0xd0, 0xcf, 0x11, 0xe0]),
  },
};

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const DOCUMENT_TYPES = [
  ...IMAGE_TYPES,
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
];

/**
 * Validates an uploaded file's declared type against an allow-list and its
 * actual content. Returns the extension to store it under.
 */
export function validateUpload(
  file: Express.Multer.File | undefined,
  allowed: string[],
): string {
  if (!file) throw new BadRequestException('No file uploaded');
  const kind = KINDS[file.mimetype];
  if (!allowed.includes(file.mimetype) || !kind) {
    throw new BadRequestException(
      `File type not allowed: ${file.originalname}`,
    );
  }
  if (!kind.matches(file.buffer)) {
    throw new BadRequestException(
      `File content does not match its type: ${file.originalname}`,
    );
  }
  return kind.ext;
}

/** Strips path parts and control characters from a client-supplied filename. */
export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? 'file';
  // Control characters are exactly what we want to strip here.
  // eslint-disable-next-line no-control-regex
  return base.replace(/[\x00-\x1f"<>|*?:]/g, '_').slice(0, 200) || 'file';
}
