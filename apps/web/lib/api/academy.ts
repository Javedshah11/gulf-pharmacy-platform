import 'server-only';
import { cache } from 'react';
import type { AcademyVideo, VideoCategory, VideoPage } from '@gulf/shared';
export function academyApiOrigin() {
  return (
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:4000'
  );
}
async function get<T>(path: string): Promise<T> {
  const response = await fetch(
    new URL('/api/health-academy/' + path, academyApiOrigin()),
    { cache: 'no-store', signal: AbortSignal.timeout(8000) },
  );
  if (!response.ok)
    throw new Error(
      response.status === 404 ? 'ACADEMY_NOT_FOUND' : 'ACADEMY_UNAVAILABLE',
    );
  return response.json();
}
export const academyCategories = cache(() =>
  get<VideoCategory[]>('categories'),
);
export const academyVideo = cache((slug: string) =>
  get<AcademyVideo>('videos/' + encodeURIComponent(slug)),
);
export const academyVideos = cache((query: string = '') =>
  get<VideoPage>('videos' + (query ? '?' + query : '')),
);
