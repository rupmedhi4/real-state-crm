import { Module } from '@nestjs/common';
import { TenantRepositoriesModule } from '../tenancy/tenancy.module';
import { Setting } from './setting.entity';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [TenantRepositoriesModule.forFeature([Setting])],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
