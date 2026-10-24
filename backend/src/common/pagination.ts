import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ description: 'Free-text search' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Field to sort by' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsIn(['ASC', 'DESC', 'asc', 'desc'])
  sortOrder?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Applies sorting and paging to a query builder and returns a paginated result.
 * `sortable` maps public sort keys to SQL column expressions so callers can
 * never sort by arbitrary (unvalidated) columns.
 */
export async function paginate<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  query: PaginationQueryDto,
  sortable: Record<string, string>,
  defaultSort: string,
): Promise<Paginated<T>> {
  const sortColumn =
    (query.sortBy && sortable[query.sortBy]) || sortable[defaultSort];
  const order = query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  qb.orderBy(sortColumn, order, 'NULLS LAST')
    .skip((query.page - 1) * query.limit)
    .take(query.limit);
  const [items, total] = await qb.getManyAndCount();
  return {
    items,
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  };
}

/** Escapes LIKE wildcards in user input and wraps it for a contains match. */
export function likeTerm(search: string): string {
  return `%${search.trim().replace(/[\\%_]/g, (m) => '\\' + m)}%`;
}
