import { BadRequestException } from '@nestjs/common';
import {
  DOCUMENT_TYPES,
  IMAGE_TYPES,
  safeFileName,
  validateUpload,
} from './file-validation';

const file = (mimetype: string, bytes: number[] | Buffer, name = 'f') =>
  ({
    mimetype,
    originalname: name,
    buffer: Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes),
  }) as Express.Multer.File;

describe('validateUpload', () => {
  it('accepts a real PNG and returns its extension', () => {
    const png = file(
      'image/png',
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0],
    );
    expect(validateUpload(png, IMAGE_TYPES)).toBe('png');
  });

  it('rejects a disallowed type', () => {
    const pdf = file('application/pdf', Buffer.from('%PDF-1.4'));
    expect(() => validateUpload(pdf, IMAGE_TYPES)).toThrow(BadRequestException);
    expect(validateUpload(pdf, DOCUMENT_TYPES)).toBe('pdf');
  });

  it('rejects content that does not match the declared type', () => {
    const fake = file('image/jpeg', Buffer.from('<html>'));
    expect(() => validateUpload(fake, IMAGE_TYPES)).toThrow('does not match');
  });

  it('rejects a missing file', () => {
    expect(() => validateUpload(undefined, IMAGE_TYPES)).toThrow('No file');
  });
});

describe('safeFileName', () => {
  it('strips directories and unsafe characters', () => {
    expect(safeFileName('../../etc/passwd')).toBe('passwd');
    expect(safeFileName('C:\\temp\\a"b<c>.pdf')).toBe('a_b_c_.pdf');
  });
});
