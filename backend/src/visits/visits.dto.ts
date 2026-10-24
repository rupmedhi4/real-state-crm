import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { VISIT_STATUSES } from '../common/constants';
import { PaginationQueryDto } from '../common/pagination';
import { EmptyToNull } from '../contacts/contacts.dto';

export class CreateVisitDto {
  @IsUUID()
  contactId: string;

  @IsOptional()
  @EmptyToNull()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  propertyId?: string | null;

  @IsDateString()
  visitDate: string;

  @IsOptional()
  @EmptyToNull()
  @ValidateIf((_o, v) => v !== null)
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'visitTime must be HH:MM' })
  visitTime?: string | null;

  @IsOptional()
  @EmptyToNull()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  agentId?: string | null;

  @IsOptional()
  @IsIn(VISIT_STATUSES)
  status?: string;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(2000)
  feedback?: string | null;

  /** When true, a follow-up task is created for the assigned agent. */
  @IsOptional()
  @IsBoolean()
  createFollowupTask?: boolean;
}

export class UpdateVisitDto extends PartialType(CreateVisitDto) {}

export class VisitQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: VISIT_STATUSES })
  @IsOptional()
  @IsIn(VISIT_STATUSES)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  agentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ enum: ['upcoming', 'past'] })
  @IsOptional()
  @IsIn(['upcoming', 'past'])
  when?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;
}
