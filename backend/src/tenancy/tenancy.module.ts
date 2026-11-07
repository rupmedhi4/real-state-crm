import { DynamicModule, Global, Module, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TENANT_DATA_SOURCE, TenantRegistry, TenantRequest } from './tenant.registry';

@Global()
@Module({ providers: [TenantRegistry], exports: [TenantRegistry] })
export class TenancyModule {}

@Module({})
export class TenantRepositoriesModule {
  static forFeature(entities: Parameters<typeof getRepositoryToken>[0][]): DynamicModule {
    const source = {
      provide: TENANT_DATA_SOURCE, scope: Scope.REQUEST,
      inject: [TenantRegistry, REQUEST],
      useFactory: (registry: TenantRegistry, request: TenantRequest) => registry.forRequest(request),
    };
    const repositories = entities.map((entity) => ({
      provide: getRepositoryToken(entity), scope: Scope.REQUEST,
      inject: [TENANT_DATA_SOURCE],
      useFactory: (db: DataSource) => db.getRepository(entity),
    }));
    return { module: TenantRepositoriesModule, providers: [source, ...repositories], exports: [TENANT_DATA_SOURCE, ...repositories.map((provider) => provider.provide)] };
  }
}
