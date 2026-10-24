import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  INTENTS,
  LEAD_SOURCES,
  LEAD_STAGES,
  PRIORITIES,
  PROPERTY_CATEGORIES,
} from '../common/constants';
import { PaginationQueryDto } from '../common/pagination';

/** Turns "" from HTML forms into null so optional fields can be cleared. */
export const EmptyToNull = () =>
  Transform(({ value }: { value: unknown }) => (value === '' ? null : value));

export class CreateContactDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(30)
  whatsapp?: string | null;

  @IsOptional()
  @EmptyToNull()
  @ValidateIf((_o, v) => v !== null)
  @IsEmail()
  @MaxLength(160)
  email?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(80)
  city?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(255)
  address?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(80)
  occupation?: string | null;

  @IsOptional()
  @IsIn(LEAD_SOURCES)
  source?: string;

  @IsOptional()
  @EmptyToNull()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  campaignId?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(200)
  propertyInterest?: string | null;

  @IsOptional()
  @IsIn(PROPERTY_CATEGORIES)
  propertyCategory?: string;

  @IsOptional()
  @IsIn(INTENTS)
  intent?: string;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(40)
  configuration?: string | null;

  @IsOptional()
  @EmptyToNull()
  @ValidateIf((_o, v) => v !== null)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  budgetMin?: number | null;

  @IsOptional()
  @EmptyToNull()
  @ValidateIf((_o, v) => v !== null)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  budgetMax?: number | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(2000)
  preferences?: string | null;

  @IsOptional()
  @IsIn(LEAD_STAGES)
  stage?: string;

  @IsOptional()
  @IsIn(PRIORITIES)
  priority?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  score?: number;

  @IsOptional()
  @EmptyToNull()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  agentId?: string | null;

  @IsOptional()
  @EmptyToNull()
  @ValidateIf((_o, v) => v !== null)
  @IsDateString()
  nextFollowup?: string | null;

  /** Optional first note; saved to the communication history. */
  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(2000)
  note?: string | null;
}

export class UpdateContactDto extends PartialType(CreateContactDto) {}

export class AssignContactDto {
  @EmptyToNull()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  agentId: string | null;
}

export class ContactStageDto {
  @IsIn(LEAD_STAGES)
  stage: string;
}

export class BulkAssignDto {
  @IsUUID('all', { each: true })
  ids: string[];

  @EmptyToNull()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  agentId: string | null;
}

export class ContactQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: LEAD_STAGES })
  @IsOptional()
  @IsIn(LEAD_STAGES)
  stage?: string;

  @ApiPropertyOptional({ enum: LEAD_SOURCES })
  @IsOptional()
  @IsIn(LEAD_SOURCES)
  source?: string;

  @ApiPropertyOptional({ enum: PRIORITIES })
  @IsOptional()
  @IsIn(PRIORITIES)
  priority?: string;

  @ApiPropertyOptional({ description: 'Agent id, or "unassigned"' })
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @ApiPropertyOptional({
    description: 'Only contacts at Qualified stage or later',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  clientsOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Only contacts with a follow-up due today or earlier',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  followupDue?: boolean;
}

export class DuplicateQueryDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsUUID()
  excludeId?: string;
}
