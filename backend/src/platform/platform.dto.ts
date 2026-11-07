import { IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { FEATURES, Feature } from '../tenancy/features';

export class CreateClientDto {
  @IsString() @MinLength(2) @MaxLength(120) name: string;
  @IsString() @Matches(/^[a-z0-9][a-z0-9-]{1,49}$/) slug: string;
  @IsEmail() @MaxLength(160) ownerEmail: string;
  @IsString() @MinLength(8) @MaxLength(72) ownerPassword: string;
  @IsOptional() @IsArray() @IsIn(FEATURES, { each: true }) features?: Feature[];
  @IsOptional() @IsInt() @Min(1) @Max(20) maxImages?: number;
}
export class UpdateClientDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsArray() @IsIn(FEATURES, { each: true }) features?: Feature[];
  @IsOptional() @IsInt() @Min(1) @Max(20) maxImages?: number;
}
export class ResetClientPasswordDto {
  @IsString() @MinLength(8) @MaxLength(72) password: string;
}
