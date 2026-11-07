import { Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { TenantRequest } from '../tenancy/tenant.registry';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Role } from '../common/constants';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto, RegisterDto } from './auth.dto';

export interface JwtPayload {
  kind?: string;
  clientId?: string;
  masterId?: string;
  sub: string;
  email: string;
  name: string;
  role: Role;
}

// Compared against when the email is unknown so response time doesn't reveal
// whether an account exists.
const DUMMY_HASH = bcrypt.hashSync('timing-safe-placeholder', 12);

@Injectable()
export class AuthService {
  constructor(
    @Inject(REQUEST) private readonly request: TenantRequest,
    private readonly config: ConfigService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.users.findByEmailWithPassword(dto.email.trim());
    const ok = await bcrypt.compare(
      dto.password,
      user?.passwordHash ?? DUMMY_HASH,
    );
    if (!user || !ok || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.issue(user);
  }

  /**
   * Public sign-up. New accounts get the AGENT role, except the very first
   * account on an empty database, which becomes ADMIN.
   */
  async register(dto: RegisterDto) {
    if (this.request.crmClient || !this.registrationEnabled()) throw new ForbiddenException('Public registration is disabled. Ask your administrator to create an account.');
    const isFirst = (await this.users.count()) === 0;
    const user = await this.users.create({
      ...dto,
      role: isFirst ? Role.ADMIN : Role.AGENT,
      designation: isFirst ? 'Admin' : 'Agent',
    });
    return this.issue(user);
  }

  registrationEnabled() {
    return this.config.get('REGISTRATION_ENABLED', this.config.get('NODE_ENV') === 'production' ? 'false' : 'true') === 'true';
  }

  private async issue(user: User) {
    const payload: JwtPayload = {
      clientId: this.request.crmClient?.id,
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    const fresh = await this.users.findOne(user.id);
    return { accessToken: await this.jwt.signAsync(payload), user: fresh };
  }
}
