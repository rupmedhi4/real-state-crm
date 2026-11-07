import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { Role } from '../common/constants';
import { Setting } from '../settings/setting.entity';
import { defaultFeatures, FEATURES } from '../tenancy/features';
import { ClientAccount, TenantRegistry } from '../tenancy/tenant.registry';
import { User } from '../users/user.entity';
import { CreateClientDto, UpdateClientDto } from './platform.dto';

const DUMMY_HASH = bcrypt.hashSync('dummy-master-password', 12);
@Injectable()
export class PlatformService {
  private readonly jwt = new JwtService();
  constructor(private readonly central: DataSource, private readonly tenants: TenantRegistry, private readonly config: ConfigService) {}

  async login(email: string, password: string) {
    const [admin] = await this.central.query('SELECT * FROM public.platform_admins WHERE email = $1', [email.trim().toLowerCase()]);
    const valid = await bcrypt.compare(password, admin?.passwordHash ?? DUMMY_HASH);
    if (!admin || !valid || !admin.isActive) throw new UnauthorizedException('Invalid email or password');
    return {
      accessToken: this.jwt.sign({ sub: admin.id, kind: 'master' }, { secret: this.config.getOrThrow<string>('JWT_SECRET'), expiresIn: '2h' }),
      admin: { id: admin.id, name: admin.name, email: admin.email },
    };
  }

  clients() {
    return this.central.query<ClientAccount[]>('SELECT * FROM public.platform_clients ORDER BY "createdAt" DESC');
  }
  async get(id: string): Promise<ClientAccount> {
    const [client] = await this.central.query<ClientAccount[]>('SELECT * FROM public.platform_clients WHERE id = $1', [id]);
    if (!client) throw new NotFoundException('Client account not found');
    return client;
  }
  async audit(adminId: string, clientId: string | null, action: string) {
    await this.central.query('INSERT INTO public.platform_audit ("adminId", "clientId", action) VALUES ($1, $2, $3)', [adminId, clientId, action]);
  }
  history() {
    return this.central.query('SELECT a.id, a.action, a."createdAt", c.name AS "clientName", m.email AS "adminEmail" FROM public.platform_audit a LEFT JOIN public.platform_clients c ON c.id = a."clientId" JOIN public.platform_admins m ON m.id = a."adminId" ORDER BY a."createdAt" DESC LIMIT 100');
  }

  async create(dto: CreateClientDto, adminId: string) {
    if (['master', 'admin', 'api', 'platform'].includes(dto.slug)) throw new BadRequestException('Choose a different workspace code');
    const id = randomUUID();
    const schema = `tenant_${id.replace(/-/g, '')}`;
    const features = dto.features ? Object.fromEntries(FEATURES.map((key) => [key, dto.features!.includes(key)])) : defaultFeatures();
    try {
      await this.central.transaction(async (em) => {
        await em.query('INSERT INTO public.platform_clients (id, name, slug, "schemaName", "ownerEmail", features, "maxImages") VALUES ($1, $2, $3, $4, $5, $6, $7)', [id, dto.name.trim(), dto.slug, schema, dto.ownerEmail.trim().toLowerCase(), JSON.stringify(features), dto.maxImages ?? 20]);
        await em.query(`CREATE SCHEMA "${schema}"`);
      });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') throw new ConflictException('Workspace code already exists');
      throw error;
    }
    try {
      const client = await this.get(id);
      const db = await this.tenants.forClient(client);
      await db.transaction(async (em) => {
        const owner = await em.save(User, { name: dto.name.trim() + ' Admin', email: client.ownerEmail, passwordHash: await bcrypt.hash(dto.ownerPassword, 12), role: Role.ADMIN, designation: 'Admin' });
        await this.central.query('UPDATE public.platform_clients SET \"ownerId\" = $2 WHERE id = $1', [id, owner.id]);
        await em.save(Setting, [{ key: 'companyName', value: dto.name.trim() }, { key: 'tagline', value: 'Your property workspace' }]);
      });
      await this.central.query('UPDATE public.platform_clients SET "isActive" = true WHERE id = $1', [id]);
    } catch (error) {
      // Only this newly allocated, inaccessible schema is removed on a failed provision.
      await this.tenants.closeClient(id).catch(() => undefined);
      await this.central.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await this.central.query('DELETE FROM public.platform_clients WHERE id = $1', [id]);
      throw error;
    }
    await this.audit(adminId, id, 'client.created');
    return this.get(id);
  }

  async update(id: string, dto: UpdateClientDto, adminId: string) {
    const client = await this.get(id);
    const features = dto.features ? Object.fromEntries(FEATURES.map((key) => [key, dto.features!.includes(key)])) : client.features;
    await this.central.query('UPDATE public.platform_clients SET name = $2, "isActive" = $3, features = $4, "maxImages" = $5 WHERE id = $1', [id, dto.name?.trim() ?? client.name, dto.isActive ?? client.isActive, JSON.stringify(features), dto.maxImages ?? client.maxImages]);
    await this.audit(adminId, id, dto.isActive === false ? 'client.suspended' : 'client.updated');
    return this.get(id);
  }

  async resetPassword(id: string, password: string, adminId: string) {
    const client = await this.get(id);
    const db = await this.tenants.forClient(client);
    const user = await db.getRepository(User).findOne({ where: { id: client.ownerId } });
    if (!user) throw new NotFoundException('Client owner account not found');
    await db.getRepository(User).update(user.id, { passwordHash: await bcrypt.hash(password, 12), isActive: true });
    await this.audit(adminId, id, 'owner.password_reset');
    return { success: true };
  }

  async openWorkspace(id: string, adminId: string) {
    const client = await this.tenants.clientById(id);
    const db = await this.tenants.forClient(client);
    const user = await db.getRepository(User).findOne({ where: { id: client.ownerId, isActive: true } });
    if (!user) throw new NotFoundException('Active client owner account not found');
    await this.audit(adminId, id, 'workspace.opened_by_master');
    return { accessToken: this.jwt.sign({ sub: user.id, email: user.email, name: user.name, role: user.role, clientId: id, masterId: adminId }, { secret: this.config.getOrThrow<string>('JWT_SECRET'), expiresIn: '1h' }) };
  }
}
