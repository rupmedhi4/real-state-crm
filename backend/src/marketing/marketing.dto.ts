import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { CAMPAIGN_STATUSES, LEAD_SOURCES } from '../common/constants';
import { PaginationQueryDto } from '../common/pagination';
import { EmptyToNull } from '../contacts/contacts.dto';

export class CreateCampaignDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @IsIn(LEAD_SOURCES)
  source: string;

  @IsOptional()
  @EmptyToNull()
  @ValidateIf((_o, v) => v !== null)
  @IsDateString()
  startDate?: string | null;

  @IsOptional()
  @EmptyToNull()
  @ValidateIf((_o, v) => v !== null)
  @IsDateString()
  endDate?: string | null;

  @IsOptional()
  @EmptyToNull()
  @ValidateIf((_o, v) => v !== null)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  budget?: number | null;

  @IsOptional()
  @IsIn(CAMPAIGN_STATUSES)
  status?: string;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class UpdateCampaignDto extends PartialType(CreateCampaignDto) {}

export class CampaignQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CAMPAIGN_STATUSES })
  @IsOptional()
  @IsIn(CAMPAIGN_STATUSES)
  status?: string;

  @ApiPropertyOptional({ enum: LEAD_SOURCES })
  @IsOptional()
  @IsIn(LEAD_SOURCES)
  source?: string;
}
