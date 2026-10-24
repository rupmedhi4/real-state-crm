import { likeTerm } from './pagination';
import { validateEnv } from '../config/env.validation';

describe('likeTerm', () => {
  it('wraps the term and escapes LIKE wildcards', () => {
    expect(likeTerm(' rahul ')).toBe('%rahul%');
    expect(likeTerm('50%_off')).toBe('%50\\%\\_off%');
  });
});

describe('validateEnv', () => {
  const base = { DB_HOST: 'h', DB_USER: 'u', DB_NAME: 'n' };

  it('requires a long JWT secret', () => {
    expect(() => validateEnv({ ...base, JWT_SECRET: 'short' })).toThrow(
      'JWT_SECRET',
    );
  });

  it('passes a complete config', () => {
    expect(() =>
      validateEnv({ ...base, JWT_SECRET: 'x'.repeat(40) }),
    ).not.toThrow();
  });
});
