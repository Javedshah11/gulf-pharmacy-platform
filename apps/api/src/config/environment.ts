import 'dotenv/config';
import { z } from 'zod';
const schema = z.object({
  DATABASE_URL: z.url().refine((v) => /^postgres(ql)?:/.test(v)),
  REDIS_URL: z.url().refine((v) => /^rediss?:/.test(v)),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  HOST: z.string().default('127.0.0.1'),
  CORS_ORIGIN: z.url().default('http://localhost:3000'),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  SESSION_HOURS: z.coerce.number().int().min(1).max(24).default(8),
});
export function validateEnvironment(input: NodeJS.ProcessEnv = process.env) {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new Error(
      'Invalid environment variables: ' +
        [...new Set(result.error.issues.map((i) => i.path.join('.')))].join(
          ', ',
        ),
    );
  if (
    result.data.NODE_ENV === 'production' &&
    !result.data.CORS_ORIGIN.startsWith('https://')
  )
    throw new Error('Production CORS_ORIGIN must use HTTPS');
  if (new URL(result.data.CORS_ORIGIN).origin !== result.data.CORS_ORIGIN)
    throw new Error(
      'CORS_ORIGIN must be an origin without a path or trailing slash',
    );
  return result.data;
}
export type Environment = ReturnType<typeof validateEnvironment>;
export const ENVIRONMENT = Symbol('ENVIRONMENT');
