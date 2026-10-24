import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { DEAL_STAGES, TRANSACTION_STATUSES } from '../common/constants';
import { PaginationQueryDto } from '../common/pagination';
import { EmptyToNull } from '../contacts/contacts.dto';

export class CreateDealDto {
  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(150)
  title?: string | null;

  @IsUUID()
  contactId: string;

  @IsOptional()
  @EmptyToNull()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  propertyId?: string | null;

  @IsOptional()
  @EmptyToNull()
  @ValidateIf((_o, v) => v !== null)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  value?: number | null;

  @IsOptional()
  @EmptyToNull()
  @ValidateIf((_o, v) => v !== null)
  @IsDateString()
  expectedClosing?: string | null;

  @IsOptional()
  @IsIn(DEAL_STAGES)
  stage?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  probability?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  commissionPct?: number;

  @IsOptional()
  @IsIn(TRANSACTION_STATUSES)
  transactionStatus?: string;

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
}

export class UpdateDealDto extends PartialType(CreateDealDto) {}

export class DealStageDto {
  @IsIn(DEAL_STAGES)
  stage: string;
}

export class DealQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: DEAL_STAGES })
  @IsOptional()
  @IsIn(DEAL_STAGES)
  stage?: string;

  @ApiPropertyOptional({ enum: TRANSACTION_STATUSES })
  @IsOptional()
  @IsIn(TRANSACTION_STATUSES)
  transactionStatus?: string;

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

  @ApiPropertyOptional({ description: 'open = not Won/Lost' })
  @IsOptional()
  @IsIn(['open', 'won', 'lost'])
  status?: string;
}
