import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentsModule } from './agents/agents.module';
import { AuthModule } from './auth/auth.module';
import { AllExceptionsFilter } from './common/http-exception.filter';
import { JwtAuthGuard, RolesGuard } from './common/guards';
import { CommunicationsModule } from './communications/communications.module';
import { validateEnv } from './config/env.validation';
import { ContactsModule } from './contacts/contacts.module';
import { dbOptions } from './database/db-options';
import { DealsModule } from './deals/deals.module';
import { DocumentsModule } from './documents/documents.module';
import { HealthController } from './health.controller';
import { MarketingModule } from './marketing/marketing.module';
import { PropertiesModule } from './properties/properties.module';
import { ReportsModule } from './reports/reports.module';
import { SettingsModule } from './settings/settings.module';
import { StorageModule } from './storage/storage.module';
import { TasksModule } from './tasks/tasks.module';
import { UsersModule } from './users/users.module';
import { VisitsModule } from './visits/visits.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    TypeOrmModule.forRootAsync({ useFactory: () => dbOptions(process.env) }),
    StorageModule,
    AuthModule,
    UsersModule,
    ContactsModule,
    PropertiesModule,
    DealsModule,
    VisitsModule,
    TasksModule,
    AgentsModule,
    CommunicationsModule,
    MarketingModule,
    ReportsModule,
    DocumentsModule,
    SettingsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Order matters: authenticate first, then check roles.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },
  ],
})
export class AppModule {}
