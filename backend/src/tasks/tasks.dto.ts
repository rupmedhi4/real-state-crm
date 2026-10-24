import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PRIORITIES, TASK_STATUSES, TASK_TYPES } from '../common/constants';
import { PaginationQueryDto } from '../common/pagination';
import { EmptyToNull } from '../contacts/contacts.dto';

export class CreateTaskDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @EmptyToNull()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  contactId?: string | null;

  @IsOptional()
  @IsIn(TASK_TYPES)
  type?: string;

  @IsOptional()
  @IsIn(PRIORITIES)
  priority?: string;

  @IsOptional()
  @EmptyToNull()
  @ValidateIf((_o, v) => v !== null)
  @IsDateString()
  dueDate?: string | null;

  @IsOptional()
  @EmptyToNull()
  @ValidateIf((_o, v) => v !== null)
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'dueTime must be HH:MM' })
  dueTime?: string | null;

  @IsOptional()
  @EmptyToNull()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  assigneeId?: string | null;

  @IsOptional()
  @IsIn(TASK_STATUSES)
  status?: string;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class UpdateTaskDto extends PartialType(CreateTaskDto) {}

export const TASK_BUCKETS = [
  'overdue',
  'today',
  'upcoming',
  'completed',
] as const;

export class TaskQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TASK_BUCKETS })
  @IsOptional()
  @IsIn(TASK_BUCKETS)
  bucket?: string;

  @ApiPropertyOptional({ enum: TASK_STATUSES })
  @IsOptional()
  @IsIn(TASK_STATUSES)
  status?: string;

  @ApiPropertyOptional({ enum: PRIORITIES })
  @IsOptional()
  @IsIn(PRIORITIES)
  priority?: string;

  @ApiPropertyOptional({ description: 'User id, or "me"' })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  contactId?: string;
}
