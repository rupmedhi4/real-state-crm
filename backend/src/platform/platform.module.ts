import { Module } from '@nestjs/common';
import { MasterGuard } from './master.guard';
import { PlatformAuthController, PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
@Module({ controllers: [PlatformAuthController, PlatformController], providers: [PlatformService, MasterGuard] })
export class PlatformModule {}
