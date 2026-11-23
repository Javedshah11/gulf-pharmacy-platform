import 'server-only';
import type { ScanResult, PublicCampaign } from '@gulf/shared';
import { academyApiOrigin } from './academy';
async function get<T>(path: string): Promise<T> {
  const response = await fetch(
    new URL('/api/engagement/' + path, academyApiOrigin()),
    { cache: 'no-store', signal: AbortSignal.timeout(8000) },
  );
  if (!response.ok)
    throw new Error(
      response.status === 404
        ? 'ENGAGEMENT_NOT_FOUND'
        : 'ENGAGEMENT_UNAVAILABLE',
    );
  return response.json();
}
export const scanPage = (code: string) =>
  get<ScanResult>('qr/' + encodeURIComponent(code));
export const campaignPage = (slug: string) =>
  get<PublicCampaign>('campaigns/' + encodeURIComponent(slug));
export const publicFaqs = (slug?: string) =>
  get<
    {
      id: string;
      questionEn: string;
      questionAr: string;
      answerEn: string;
      answerAr: string;
    }[]
  >('knowledge' + (slug ? '?branch=' + encodeURIComponent(slug) : ''));
