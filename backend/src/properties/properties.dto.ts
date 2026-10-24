import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  LISTING_TYPES,
  PROPERTY_CATEGORIES,
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
} from '../common/constants';
import { PaginationQueryDto } from '../common/pagination';
import { EmptyToNull } from '../contacts/contacts.dto';

export class CreatePropertyDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  title: string;

  @IsOptional()
  @IsIn(LISTING_TYPES)
  listingType?: string;

  @IsOptional()
  @IsIn(PROPERTY_CATEGORIES)
  category?: string;

  @IsOptional()
  @IsIn(PROPERTY_TYPES)
  propertyType?: string;

  @IsOptional()
  @EmptyToNull()
  @ValidateIf((_o, v) => v !== null)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  price?: number | null;

  @IsOptional()
  @EmptyToNull()
  @ValidateIf((_o, v) => v !== null)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bedrooms?: number | null;

  @IsOptional()
  @EmptyToNull()
  @ValidateIf((_o, v) => v !== null)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  areaSqft?: number | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(80)
  city?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(120)
  locality?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(255)
  address?: string | null;

  @IsOptional()
  @IsIn(PROPERTY_STATUSES)
  status?: string;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @IsOptional()
  @EmptyToNull()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  agentId?: string | null;
}

export class UpdatePropertyDto extends PartialType(CreatePropertyDto) {}

export class ReorderImagesDto {
  /** Image ids in the desired order; the first one becomes the cover. */
  @IsUUID('all', { each: true })
  @ArrayMinSize(1)
  imageIds: string[];
}

export class PropertyQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PROPERTY_STATUSES })
  @IsOptional()
  @IsIn(PROPERTY_STATUSES)
  status?: string;

  @ApiPropertyOptional({ enum: LISTING_TYPES })
  @IsOptional()
  @IsIn(LISTING_TYPES)
  listingType?: string;

  @ApiPropertyOptional({ enum: PROPERTY_CATEGORIES })
  @IsOptional()
  @IsIn(PROPERTY_CATEGORIES)
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  agentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;
}
