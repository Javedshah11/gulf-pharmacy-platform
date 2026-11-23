import { cache } from 'react';
import type { Branch } from '@gulf/shared';
export class PublicApiError extends Error {
  constructor(public status: number) {
    super('Branch information is unavailable');
  }
}
async function get<T>(path: string): Promise<T> {
  let response: Response;
  try {
    const origin =
      process.env.API_INTERNAL_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      'http://localhost:4000';
    response = await fetch(new URL('/api' + path, origin), {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    throw new PublicApiError(503);
  }
  if (!response.ok) throw new PublicApiError(response.status);
  return response.json() as Promise<T>;
}
// React cache deduplicates metadata/page reads within a render, never between requests.
export const listPublicBranches = cache((q = '') =>
  get<Branch[]>('/branches' + (q ? '?q=' + encodeURIComponent(q) : '')),
);
export const getPublicBranch = cache((slug: string) =>
  get<Branch>('/branches/' + encodeURIComponent(slug)),
);
