import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { AuthUser } from '../common/decorators';
import { likeTerm, paginate } from '../common/pagination';
import {
  DOCUMENT_TYPES,
  safeFileName,
  validateUpload,
} from '../storage/file-validation';
import { StorageService } from '../storage/storage.service';
import { CrmDocument } from './document.entity';
import { DocumentQueryDto, UploadDocumentDto } from './documents.dto';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(CrmDocument)
    private readonly repo: Repository<CrmDocument>,
    private readonly storage: StorageService,
  ) {}

  private baseQuery() {
    return this.repo
      .createQueryBuilder('doc')
      .leftJoin('doc.contact', 'contact')
      .addSelect(['contact.id', 'contact.name'])
      .leftJoin('doc.property', 'property')
      .addSelect(['property.id', 'property.title'])
      .leftJoin('doc.deal', 'deal')
      .addSelect(['deal.id', 'deal.title'])
      .leftJoin('doc.uploadedBy', 'uploadedBy')
      .addSelect(['uploadedBy.id', 'uploadedBy.name']);
  }

  findAll(query: DocumentQueryDto) {
    const qb = this.baseQuery();
    if (query.search) {
      qb.andWhere(
        new Brackets((w) =>
          w
            .where('doc.originalName ILIKE :s')
            .orWhere('contact.name ILIKE :s')
            .orWhere('property.title ILIKE :s'),
        ),
        { s: likeTerm(query.search) },
      );
    }
    if (query.category) {
      qb.andWhere('doc.category = :category', { category: query.category });
    }
    if (query.contactId) {
      qb.andWhere('doc.contactId = :contactId', { contactId: query.contactId });
    }
    if (query.propertyId) {
      qb.andWhere('doc.propertyId = :propertyId', {
        propertyId: query.propertyId,
      });
    }
    if (query.dealId)
      qb.andWhere('doc.dealId = :dealId', { dealId: query.dealId });
    return paginate(
      qb,
      query,
      {
        createdAt: 'doc.createdAt',
        originalName: 'doc.originalName',
        category: 'doc.category',
        sizeBytes: 'doc.sizeBytes',
      },
      'createdAt',
    );
  }

  async findOne(id: string) {
    const doc = await this.baseQuery().where('doc.id = :id', { id }).getOne();
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async upload(
    file: Express.Multer.File | undefined,
    dto: UploadDocumentDto,
    actor: AuthUser,
  ) {
    const ext = validateUpload(file, DOCUMENT_TYPES);
    const stored = await this.storage.save('documents', file!.buffer, ext);
    try {
      const saved = await this.repo.save(
        this.repo.create({
          ...dto,
          category: dto.category ?? 'Other',
          originalName: safeFileName(file!.originalname),
          storageKey: stored.key,
          mimeType: file!.mimetype,
          sizeBytes: stored.size,
          uploadedById: actor.id,
        }),
      );
      return this.findOne(saved.id);
    } catch (err) {
      // e.g. a related record id that doesn't exist (FK violation)
      await this.storage.remove(stored.key);
      throw err;
    }
  }

  async open(id: string) {
    const doc = await this.repo
      .createQueryBuilder('doc')
      .addSelect('doc.storageKey')
      .where('doc.id = :id', { id })
      .getOne();
    if (!doc) throw new NotFoundException('Document not found');
    return { doc, stream: await this.storage.read(doc.storageKey) };
  }

  async remove(id: string) {
    const doc = await this.repo
      .createQueryBuilder('doc')
      .addSelect('doc.storageKey')
      .where('doc.id = :id', { id })
      .getOne();
    if (!doc) throw new NotFoundException('Document not found');
    await this.repo.delete(id);
    await this.storage.remove(doc.storageKey);
  }
}
