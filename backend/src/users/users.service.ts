import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Role } from '../common/constants';
import { AuthUser } from '../common/decorators';
import { likeTerm, paginate } from '../common/pagination';
import {
  ChangePasswordDto,
  CreateUserDto,
  UpdateProfileDto,
  UpdateUserDto,
  UserQueryDto,
} from './users.dto';
import { User } from './user.entity';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  hashPassword(password: string) {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  findAll(query: UserQueryDto) {
    const qb = this.repo.createQueryBuilder('u');
    if (query.search) {
      qb.andWhere('(u.name ILIKE :s OR u.email ILIKE :s OR u.phone ILIKE :s)', {
        s: likeTerm(query.search),
      });
    }
    if (query.role) qb.andWhere('u.role = :role', { role: query.role });
    return paginate(
      qb,
      query,
      {
        name: 'u.name',
        email: 'u.email',
        role: 'u.role',
        createdAt: 'u.createdAt',
      },
      'name',
    );
  }

  /** Lightweight list for assignment dropdowns. */
  options() {
    return this.repo.find({
      where: { isActive: true },
      select: { id: true, name: true, role: true, designation: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  findByEmailWithPassword(email: string) {
    return this.repo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('LOWER(u.email) = LOWER(:email)', { email })
      .getOne();
  }

  count() {
    return this.repo.count();
  }

  async create(dto: CreateUserDto, actor?: AuthUser) {
    const role = dto.role ?? Role.AGENT;
    if (actor && role === Role.ADMIN && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can create admin users');
    }
    await this.ensureEmailFree(dto.email);
    const user = this.repo.create({
      name: dto.name.trim(),
      email: dto.email.trim().toLowerCase(),
      phone: dto.phone?.trim() || null,
      role,
      designation: dto.designation ?? 'Agent',
      passwordHash: await this.hashPassword(dto.password),
    });
    const saved = await this.repo.save(user);
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateUserDto, actor: AuthUser) {
    const user = await this.findOne(id);
    const touchesAccess = dto.role !== undefined || dto.isActive !== undefined;
    if (actor.role !== Role.ADMIN) {
      if (user.role === Role.ADMIN || dto.role === Role.ADMIN) {
        throw new ForbiddenException('Only admins can manage admin accounts');
      }
    }
    if (touchesAccess && actor.id === id) {
      throw new BadRequestException(
        'You cannot change your own role or active status',
      );
    }
    if (dto.email && dto.email.toLowerCase() !== user.email) {
      await this.ensureEmailFree(dto.email);
      user.email = dto.email.trim().toLowerCase();
    }
    if (dto.name !== undefined) user.name = dto.name.trim();
    if (dto.phone !== undefined) user.phone = dto.phone.trim() || null;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.designation !== undefined) user.designation = dto.designation;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.password) user.passwordHash = await this.hashPassword(dto.password);
    await this.repo.save(user);
    return this.findOne(id);
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    const user = await this.findOne(id);
    if (dto.name !== undefined) user.name = dto.name.trim();
    if (dto.phone !== undefined) user.phone = dto.phone.trim() || null;
    await this.repo.save(user);
    return user;
  }

  async changePassword(id: string, dto: ChangePasswordDto) {
    const user = await this.repo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.id = :id', { id })
      .getOne();
    if (
      !user ||
      !(await bcrypt.compare(dto.currentPassword, user.passwordHash))
    ) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    user.passwordHash = await this.hashPassword(dto.newPassword);
    await this.repo.save(user);
  }

  async remove(id: string, actor: AuthUser) {
    if (id === actor.id) {
      throw new BadRequestException('You cannot delete your own account');
    }
    const user = await this.findOne(id);
    if (user.role === Role.ADMIN && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can delete admin accounts');
    }
    // Assigned records keep existing; their agent is set to NULL by the FK.
    await this.repo.delete(id);
  }

  private async ensureEmailFree(email: string) {
    const exists = await this.repo
      .createQueryBuilder('u')
      .where('LOWER(u.email) = LOWER(:email)', { email: email.trim() })
      .getExists();
    if (exists) throw new ConflictException('Email is already registered');
  }
}
