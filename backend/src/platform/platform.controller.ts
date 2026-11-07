import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { LoginDto } from '../auth/auth.dto';
import { Public } from '../common/decorators';
import { FEATURES } from '../tenancy/features';
import { MasterGuard } from './master.guard';
import { CreateClientDto, ResetClientPasswordDto, UpdateClientDto } from './platform.dto';
import { PlatformService } from './platform.service';

@Public()
@Controller('platform/auth')
export class PlatformAuthController {
  constructor(private readonly platform: PlatformService) {}
  @Post('login') @HttpCode(200)
  login(@Body() dto: LoginDto) { return this.platform.login(dto.email, dto.password); }
}

@Public()
@UseGuards(MasterGuard)
@Controller('platform')
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}
  @Get('me') me(@Req() req: { master: unknown }) { return req.master; }
  @Get('features') features() { return FEATURES; }
  @Get('clients') clients() { return this.platform.clients(); }
  @Get('audit') audit() { return this.platform.history(); }
  @Post('clients') create(@Body() dto: CreateClientDto, @Req() req: { master: { id: string } }) { return this.platform.create(dto, req.master.id); }
  @Patch('clients/:id') update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateClientDto, @Req() req: { master: { id: string } }) { return this.platform.update(id, dto, req.master.id); }
  @Post('clients/:id/password') password(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ResetClientPasswordDto, @Req() req: { master: { id: string } }) { return this.platform.resetPassword(id, dto.password, req.master.id); }
  @Post('clients/:id/open') open(@Param('id', ParseUUIDPipe) id: string, @Req() req: { master: { id: string } }) { return this.platform.openWorkspace(id, req.master.id); }
}
