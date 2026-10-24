import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tagline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  companyPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  companyEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyAddress?: string;

  @IsOptional()
  @IsIn(['INR'])
  currency?: string;

  @IsOptional()
  @IsIn(['DD/MM/YYYY', 'YYYY-MM-DD'])
  dateFormat?: string;
}
