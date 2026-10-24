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
  for (const key of ['DB_HOST', 'DB_USER', 'DB_NAME']) {
    if (!config[key]) errors.push(`${key} is required`);
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
