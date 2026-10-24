import { ValueTransformer } from 'typeorm';

/**
 * Postgres returns bigint/numeric columns as strings to avoid precision loss.
 * Rupee amounts in this CRM stay well inside Number.MAX_SAFE_INTEGER, so we
 * expose them as plain numbers.
 */
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? null : Number(value),
};
