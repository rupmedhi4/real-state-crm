import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Feature } from './features';
import { TenantRegistry, TenantRequest } from './tenant.registry';

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(private readonly tenants: TenantRegistry) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<TenantRequest>();
    const path = req.originalUrl.split('?')[0].replace(/^\/api\//, '');
    if (path.startsWith('platform/') || path === 'health') return true;
    // Auth/branding/config endpoints are public; repositories still resolve their workspace.
    if (path.startsWith('auth/') || path === 'settings/branding') return true;
    await this.tenants.forRequest(req);
    const client = req.crmClient;
    if (!client) return true;
    let feature: Feature | undefined;
    const section = path.split('/')[0];
    if (section === 'contacts') feature = 'leads';
    else if (section === 'properties') feature = path.includes('/images') ? 'photos' : 'properties';
    else if (section === 'files') feature = 'photos';
    else if (section === 'activities') feature = 'communications';
    else if (section === 'agents' || (section === 'users' && !path.startsWith('users/me') && path !== 'users/options')) feature = 'team';
    else if (section === 'reports') feature = path === 'reports/dashboard' ? 'dashboard' : 'reports';
    else if (['deals', 'visits', 'tasks', 'marketing', 'documents'].includes(section)) feature = section as Feature;
    if (feature && client.features[feature] !== true) throw new ForbiddenException('This feature is disabled for your client account. Contact the master administrator.');
    if (feature === 'photos' && !client.features.properties) throw new ForbiddenException('Property access is disabled for this client account.');
    return true;
  }
}
