import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository } from 'typeorm';
import { likeTerm, paginate } from '../common/pagination';
import {
  IMAGE_TYPES,
  safeFileName,
  validateUpload,
} from '../storage/file-validation';
import { StorageService } from '../storage/storage.service';
import {
  CreatePropertyDto,
  PropertyQueryDto,
  UpdatePropertyDto,
} from './properties.dto';
import { PropertyImage } from './property-image.entity';
import { Property } from './property.entity';

@Injectable()
export class PropertiesService {
  private readonly maxImages: number;

  constructor(
    @InjectRepository(Property) private readonly repo: Repository<Property>,
    @InjectRepository(PropertyImage)
    private readonly images: Repository<PropertyImage>,
    private readonly dataSource: DataSource,
    private readonly storage: StorageService,
    config: ConfigService,
  ) {
    this.maxImages = Number(config.get('MAX_IMAGES_PER_PROPERTY', 20));
  }

  async findAll(query: PropertyQueryDto) {
    const qb = this.repo
      .createQueryBuilder('p')
      .leftJoin('p.agent', 'agent')
      .addSelect(['agent.id', 'agent.name']);

    if (query.search) {
      qb.andWhere(
        new Brackets((w) =>
          w
            .where('p.title ILIKE :s')
            .orWhere('p.locality ILIKE :s')
            .orWhere('p.city ILIKE :s')
            .orWhere('p.address ILIKE :s'),
        ),
        { s: likeTerm(query.search) },
      );
    }
    if (query.status)
      qb.andWhere('p.status = :status', { status: query.status });
    if (query.listingType) {
      qb.andWhere('p.listingType = :lt', { lt: query.listingType });
    }
    if (query.category) {
      qb.andWhere('p.category = :cat', { cat: query.category });
    }
    if (query.city)
      qb.andWhere('p.city ILIKE :city', { city: likeTerm(query.city) });
    if (query.agentId)
      qb.andWhere('p.agentId = :agentId', { agentId: query.agentId });
    if (query.minPrice != null) {
      qb.andWhere('p.price >= :minPrice', { minPrice: query.minPrice });
    }
    if (query.maxPrice != null) {
      qb.andWhere('p.price <= :maxPrice', { maxPrice: query.maxPrice });
    }

    const page = await paginate(
      qb,
      query,
      {
        title: 'p.title',
        price: 'p.price',
        createdAt: 'p.createdAt',
        status: 'p.status',
        locality: 'p.locality',
        areaSqft: 'p.areaSqft',
      },
      'createdAt',
    );
    await this.attachImages(page.items);
    return page;
  }

  options() {
    return this.repo.find({
      select: { id: true, title: true, locality: true, status: true },
      order: { title: 'ASC' },
    });
  }

  async findOne(id: string) {
    const property = await this.repo.findOne({
      where: { id },
      relations: { agent: true },
    });
    if (!property) throw new NotFoundException('Property not found');
    await this.attachImages([property]);
    return property;
  }

  async create(dto: CreatePropertyDto) {
    const saved = await this.repo.save(this.repo.create(dto));
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdatePropertyDto) {
    await this.ensureExists(id);
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.ensureExists(id);
    const imgs = await this.images.find({ where: { propertyId: id } });
    await this.repo.delete(id); // images cascade in the DB
    await Promise.all(imgs.map((i) => this.storage.remove(i.storageKey)));
  }

  /** Validates every file first, then stores them all; nothing is saved on failure. */
  async addImages(id: string, files: Express.Multer.File[]) {
    await this.ensureExists(id);
    if (!files?.length) throw new BadRequestException('No images uploaded');
    const existing = await this.images.count({ where: { propertyId: id } });
    if (existing + files.length > this.maxImages) {
      throw new BadRequestException(
        `A property can have at most ${this.maxImages} images`,
      );
    }
    const exts = files.map((f) => validateUpload(f, IMAGE_TYPES));

    const stored: string[] = [];
    try {
      const rows: PropertyImage[] = [];
      for (let i = 0; i < files.length; i++) {
        const s = await this.storage.save(
          'property-images',
          files[i].buffer,
          exts[i],
        );
        stored.push(s.key);
        rows.push(
          this.images.create({
            propertyId: id,
            storageKey: s.key,
            originalName: safeFileName(files[i].originalname),
            mimeType: files[i].mimetype,
            sizeBytes: s.size,
            sortOrder: existing + i,
          }),
        );
      }
      await this.images.save(rows);
    } catch (err) {
      await Promise.all(stored.map((k) => this.storage.remove(k)));
      throw err;
    }
    return this.findOne(id);
  }

  async removeImage(id: string, imageId: string) {
    const img = await this.images.findOne({
      where: { id: imageId, propertyId: id },
    });
    if (!img) throw new NotFoundException('Image not found');
    await this.images.delete(imageId);
    await this.storage.remove(img.storageKey);
    await this.normalizeOrder(id);
    return this.findOne(id);
  }

  async reorderImages(id: string, imageIds: string[]) {
    const imgs = await this.images.find({ where: { propertyId: id } });
    const known = new Set(imgs.map((i) => i.id));
    if (imageIds.some((i) => !known.has(i))) {
      throw new BadRequestException('Unknown image id for this property');
    }
    // Ids not mentioned keep their relative order after the listed ones.
    const rest = imgs
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((i) => i.id)
      .filter((i) => !imageIds.includes(i));
    await this.dataSource.transaction(async (em) => {
      const order = [...imageIds, ...rest];
      for (let i = 0; i < order.length; i++) {
        await em.update(PropertyImage, order[i], { sortOrder: i });
      }
    });
    return this.findOne(id);
  }

  async readPublicImage(key: string) {
    const img = await this.images.findOne({ where: { storageKey: key } });
    if (!img) throw new NotFoundException('Image not found');
    return { stream: await this.storage.read(key), type: img.mimeType };
  }

  private async normalizeOrder(propertyId: string) {
    const imgs = await this.images.find({
      where: { propertyId },
      order: { sortOrder: 'ASC' },
    });
    for (let i = 0; i < imgs.length; i++) {
      if (imgs[i].sortOrder !== i) {
        await this.images.update(imgs[i].id, { sortOrder: i });
      }
    }
  }

  private async attachImages(properties: Property[]) {
    if (!properties.length) return;
    const imgs = await this.images
      .createQueryBuilder('i')
      .where('i.propertyId IN (:...ids)', { ids: properties.map((p) => p.id) })
      .orderBy('i.sortOrder', 'ASC')
      .getMany();
    for (const p of properties) {
      p.images = imgs.filter((i) => i.propertyId === p.id);
    }
  }

  private async ensureExists(id: string) {
    if (!(await this.repo.existsBy({ id }))) {
      throw new NotFoundException('Property not found');
    }
  }
}
