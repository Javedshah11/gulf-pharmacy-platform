import { academyApiOrigin } from '@/lib/api/academy';
export const dynamic = 'force-dynamic';
async function deliver(
  request: Request,
  { params }: { params: Promise<{ slug: string; type: string }> },
) {
  const { slug, type } = await params;
  if (
    !/^[a-z0-9-]{1,120}$/.test(slug) ||
    !['playback', 'thumbnail', 'captions-en', 'captions-ar'].includes(type)
  )
    return new Response(null, { status: 404 });
  try {
    const response = await fetch(
      new URL(
        '/api/health-academy/videos/' + slug + '/assets/' + type,
        academyApiOrigin(),
      ),
      {
        method: request.method,
        cache: 'no-store',
        headers: request.headers.has('range')
          ? { Range: request.headers.get('range')! }
          : {},
        signal: AbortSignal.timeout(15000),
      },
    );
    const headers = new Headers({
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex',
    });
    for (const key of [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
    ])
      if (response.headers.has(key))
        headers.set(key, response.headers.get(key)!);
    return new Response(response.body, { status: response.status, headers });
  } catch {
    return new Response(null, { status: 503 });
  }
}
export const GET = deliver;
export const HEAD = deliver;
