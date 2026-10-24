import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ACTIVITY_OUTCOMES, ACTIVITY_TYPES } from '../common/constants';
import { PaginationQueryDto } from '../common/pagination';
import { EmptyToNull } from '../contacts/contacts.dto';

export class CreateActivityDto {
  @IsUUID()
  contactId: string;

  @IsIn(ACTIVITY_TYPES)
  type: string;

  @IsOptional()
  @EmptyToNull()
  @ValidateIf((_o, v) => v !== null)
  @IsIn(ACTIVITY_OUTCOMES)
  outcome?: string | null;

  @IsOptional()
  @EmptyToNull()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  agentId?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;

  /** Defaults to now. */
  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}

export class UpdateActivityDto extends PartialType(CreateActivityDto) {}

export class ActivityQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ACTIVITY_TYPES })
  @IsOptional()
  @IsIn(ACTIVITY_TYPES)
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  agentId?: string;
}
