/**
 * Fails fast at startup when required configuration is missing or unsafe,
 * instead of failing later on the first request.
 */
export function validateEnv(config: Record<string, unknown>) {
  const errors: string[] = [];
  const secret = typeof config.JWT_SECRET === 'string' ? config.JWT_SECRET : '';
  if (secret.length < 32) {
    errors.push('JWT_SECRET must be set and at least 32 characters long');
  }
  if (/change[-_ ]?me/i.test(secret) && config.NODE_ENV === 'production') {
    errors.push('JWT_SECRET still has its placeholder value');
  }
  if (config.DATABASE_URL) {
    try {
      const url = new URL(String(config.DATABASE_URL));
      if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username || url.pathname.length < 2) {
        errors.push('DATABASE_URL must be a PostgreSQL connection URL with host, user and database');
      }
    } catch { errors.push('DATABASE_URL must be a valid PostgreSQL connection URL'); }
  } else {
    for (const key of ['DB_HOST', 'DB_USER', 'DB_NAME']) {
      if (!config[key]) errors.push(`${key} is required`);
    }
  }
  for (const key of ['REGISTRATION_ENABLED', 'DB_SSL', 'DB_SSL_REJECT_UNAUTHORIZED']) {
    if (config[key] !== undefined && !['true', 'false'].includes(String(config[key]))) errors.push(`${key} must be true or false`);
  }
  for (const key of ['MAX_IMAGES_PER_PROPERTY', 'MAX_IMAGE_SIZE_MB', 'MAX_DOCUMENT_SIZE_MB']) {
    if (config[key] !== undefined && (!Number.isInteger(Number(config[key])) || Number(config[key]) < 1 || Number(config[key]) > (key === 'MAX_IMAGES_PER_PROPERTY' ? 20 : 50))) errors.push(`${key} is outside the supported upload limits`);
  }
  if (config.STORAGE_DRIVER === 's3') {
    for (const key of [
      'S3_BUCKET',
      'S3_ACCESS_KEY_ID',
      'S3_SECRET_ACCESS_KEY',
    ]) {
      if (!config[key])
        errors.push(`${key} is required when STORAGE_DRIVER=s3`);
    }
  }
  if (errors.length) {
    throw new Error(
      `Invalid environment configuration:\n- ${errors.join('\n- ')}`,
    );
  }
  return config;
}
