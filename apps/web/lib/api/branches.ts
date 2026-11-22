import type { Branch } from '@gulf/shared';
export async function fetchBranch(
  slug: string,
  signal: AbortSignal,
): Promise<Branch> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const url = new URL(base);
  if (!['http:', 'https:'].includes(url.protocol))
    throw new Error('Invalid API URL');
  const response = await fetch(
    new URL('/api/branches/' + encodeURIComponent(slug), url),
    { signal, cache: 'no-store' },
  );
  if (!response.ok) throw new Error('Branch unavailable');
  return response.json() as Promise<Branch>;
}
