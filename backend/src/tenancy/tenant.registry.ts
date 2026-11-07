import { ForbiddenException, Injectable, OnModuleDestroy, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { DataSource } from 'typeorm';
import { dbOptions } from '../database/db-options';
import { InitialSchema1792338998632 } from '../database/migrations/1792338998632-InitialSchema';
import { PropertyDetails1794020000000 } from '../database/migrations/1794020000000-PropertyDetails';
import { FeatureFlags } from './features';

export interface ClientAccount {
  id: string; name: string; slug: string; schemaName: string; ownerEmail: string;
  ownerId?: string; isActive: boolean; features: FeatureFlags; maxImages: number; createdAt: string;
}
export interface TenantRequest extends Request {
  crmClient?: ClientAccount;
  tenantDataSource?: Promise<DataSource>;
}
export const TENANT_DATA_SOURCE = 'TENANT_DATA_SOURCE';

/** One connection pool/schema per client; request-scoped repositories never use another client's pool. */
@Injectable()
export class TenantRegistry implements OnModuleDestroy {
  private readonly pools = new Map<string, Promise<DataSource>>();
  private readonly jwt = new JwtService();
  constructor(readonly central: DataSource, private readonly config: ConfigService) {}

  async clientById(id: string): Promise<ClientAccount> {
    const [client] = await this.central.query<ClientAccount[]>('SELECT * FROM public.platform_clients WHERE id = $1', [id]);
    if (!client || !client.isActive) throw new ForbiddenException('This client account is inactive or unavailable. Contact the master administrator.');
    return client;
  }

  forRequest(req: TenantRequest): Promise<DataSource> {
    if (!req.tenantDataSource) req.tenantDataSource = this.resolveRequest(req);
    return req.tenantDataSource;
  }

  private async resolveRequest(req: TenantRequest): Promise<DataSource> {
    const path = req.originalUrl.split('?')[0];
    if (path === '/api/auth/options' || (path === '/api/settings/branding' && !req.query.workspace && !req.headers.authorization)) return this.central;
    const isPublicWorkspace = path === '/api/settings/branding' || path.startsWith('/api/files/property-images/');
    const isLogin = path === '/api/auth/login';
    const isRegistration = path === '/api/auth/register';
    const publicWorkspace = isLogin || isRegistration ? req.body?.workspace : req.query.workspace;
    const bearer = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
    let client: ClientAccount | undefined;
    if (bearer && !isLogin && !isRegistration && !isPublicWorkspace) {
      let payload: { kind?: string; clientId?: string };
      try { payload = this.jwt.verify(bearer, { secret: this.config.getOrThrow<string>('JWT_SECRET') }); }
      catch { throw new UnauthorizedException('Invalid or expired session'); }
      if (payload.kind === 'master') throw new ForbiddenException('Open a client workspace from the master console to access CRM records.');
      if (payload.clientId) client = await this.clientById(payload.clientId);
      // Authenticated sessions cannot choose a different workspace via a header/query/body.
    } else if (publicWorkspace) {
      if (typeof publicWorkspace !== 'string' || !/^[a-z0-9][a-z0-9-]{1,49}$/.test(publicWorkspace)) throw new UnauthorizedException('Invalid workspace code');
      const [found] = await this.central.query<ClientAccount[]>('SELECT * FROM public.platform_clients WHERE slug = $1 AND "isActive" = true', [publicWorkspace]);
      if (!found) throw new UnauthorizedException('Workspace unavailable');
      client = found;
    }
    if (client) {
      req.crmClient = client;
      return this.forClient(client);
    }
    if (this.config.get('ALLOW_LEGACY_LOGIN', this.config.get('NODE_ENV') === 'production' ? 'false' : 'true') !== 'true') {
      throw new UnauthorizedException('Enter your client workspace code');
    }
    return this.central;
  }

  forClient(client: ClientAccount): Promise<DataSource> {
    if (!/^tenant_[a-f0-9]{32}$/.test(client.schemaName)) throw new Error('Invalid client schema');
    let pending = this.pools.get(client.id);
    if (!pending) {
      const options = dbOptions();
      pending = new DataSource({
        ...options, schema: client.schemaName,
        migrations: [InitialSchema1792338998632, PropertyDetails1794020000000],
        extra: { ...options.extra, max: 2, idleTimeoutMillis: 10000, options: `-c search_path=${client.schemaName}` },
      }).initialize().then(async (source) => {
        try { await source.runMigrations(); return source; }
        catch (error) { await source.destroy(); throw error; }
      });
      this.pools.set(client.id, pending);
      pending.catch(() => this.pools.delete(client.id));
    }
    return pending;
  }

  async closeClient(id: string) {
    const pending = this.pools.get(id);
    this.pools.delete(id);
    if (pending) { const source = await pending; if (source.isInitialized) await source.destroy(); }
  }

  async onModuleDestroy() {
    await Promise.allSettled([...this.pools.keys()].map((id) => this.closeClient(id)));
  }
}
