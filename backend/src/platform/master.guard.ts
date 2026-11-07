import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';

@Injectable()
export class MasterGuard implements CanActivate {
  private readonly jwt = new JwtService();
  constructor(private readonly config: ConfigService, private readonly central: DataSource) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    try {
      const token = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
      const payload = this.jwt.verify(token || '', { secret: this.config.getOrThrow<string>('JWT_SECRET') });
      if (payload.kind !== 'master') throw new Error('Wrong session type');
      const [admin] = await this.central.query('SELECT id, name, email FROM public.platform_admins WHERE id = $1 AND "isActive" = true', [payload.sub]);
      if (!admin) throw new Error('Inactive master');
      req.master = admin;
      return true;
    } catch { throw new UnauthorizedException('Sign in to the master administrator console'); }
  }
}
