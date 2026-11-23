import { z } from 'zod';
export function engagementConfig(input: NodeJS.ProcessEnv) {
  const result = z
    .object({
      PUBLIC_SITE_ORIGIN: z.url().optional(),
      OLLAMA_ENABLED: z.enum(['true', 'false']).default('false'),
      OLLAMA_URL: z.url().default('http://127.0.0.1:11434'),
      OLLAMA_MODEL: z.string().min(1).max(100).default('qwen3:4b'),
      OLLAMA_TIMEOUT_MS: z.coerce
        .number()
        .int()
        .min(100)
        .max(15000)
        .default(4000),
      ENGAGEMENT_ENCRYPTION_KEY: z
        .string()
        .regex(/^[a-f0-9]{64}$/i)
        .optional(),
      META_APP_SECRET: z.string().min(16).optional(),
      META_WEBHOOK_VERIFY_TOKEN: z.string().min(16).optional(),
      META_ACCESS_TOKEN: z.string().optional(),
      META_PHONE_NUMBER_ID: z.string().regex(/^\d+$/).optional(),
      MARKETING_RETENTION_DAYS: z.coerce
        .number()
        .int()
        .min(30)
        .max(730)
        .default(180),
    })
    .safeParse(input);
  if (!result.success)
    throw new Error(
      'Invalid engagement settings: ' +
        result.error.issues.map((i) => i.path.join('.')).join(', '),
    );
  const c = result.data;
  for (const value of [c.PUBLIC_SITE_ORIGIN, c.OLLAMA_URL])
    if (value) {
      const u = new URL(value);
      if (
        u.username ||
        u.password ||
        u.search ||
        u.hash ||
        u.pathname !== '/' ||
        !['http:', 'https:'].includes(u.protocol)
      )
        throw new Error('Engagement endpoint must be an HTTP(S) origin');
    }
  return c;
}
