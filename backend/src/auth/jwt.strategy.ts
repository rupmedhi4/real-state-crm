import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUser } from '../common/decorators';
import type { TenantRequest } from '../tenancy/tenant.registry';
import { TenantRegistry } from '../tenancy/tenant.registry';
import { User } from '../users/user.entity';
import { JwtPayload } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly tenants: TenantRegistry,
  ) {
    super({
      passReqToCallback: true,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Re-reads the user on every request so deactivated accounts and role
   * changes take effect immediately instead of when the token expires.
   */
  async validate(req: TenantRequest, payload: JwtPayload): Promise<AuthUser> {
    if (payload.kind === 'master') throw new UnauthorizedException('Use the master console');
    const db = await this.tenants.forRequest(req);
    if (payload.masterId) {
      const [master] = await this.tenants.central.query('SELECT id FROM public.platform_admins WHERE id = $1 AND \"isActive\" = true', [payload.masterId]);
      if (!master) throw new UnauthorizedException('Master session is no longer valid');
    }
    const user = await db.getRepository(User).findOne({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Session is no longer valid');
    }
    return { id: user.id, email: user.email, name: user.name, role: user.role, clientId: req.crmClient?.id };
  }
}
