import { notFound } from 'next/navigation';
import Link from 'next/link';
import { academyVideo, academyVideos } from '@/lib/api/academy';
import { requireLocale } from '@/features/localization/locale';
import {
  academyText,
  VideoCard,
  videoText,
  assetUrl,
} from '@/features/health-academy/academy';
import { AcademyPlayer } from '@/features/health-academy/player';
import { pageMetadata, siteOrigin } from '@/lib/seo/site';
import '../academy.css';
type Props = { params: Promise<{ locale: string; slug: string }> };
export async function generateMetadata({ params }: Props) {
  const p = await params,
    l = requireLocale(p.locale);
  try {
    const v = await academyVideo(p.slug);
    return pageMetadata(
      l,
      '/health-academy/' + v.slug,
      videoText(v, l),
      (l === 'ar' ? v.descriptionAr : v.descriptionEn).slice(0, 180),
      v.contentKind === 'GENERAL_EDUCATION',
    );
  } catch {
    return { robots: { index: false, follow: false } };
  }
}
export default async function VideoDetail({ params }: Props) {
  const p = await params,
    l = requireLocale(p.locale),
    d = academyText[l];
  let v;
  try {
    v = await academyVideo(p.slug);
  } catch (e) {
    if (e instanceof Error && e.message === 'ACADEMY_NOT_FOUND') notFound();
    throw e;
  }
  const related = await academyVideos(
    'category=' + v.category.slug + '&pageSize=4',
  ).catch(() => ({ items: [] }));
  const origin = siteOrigin();
  const structured =
    origin && v.contentKind === 'GENERAL_EDUCATION'
      ? {
          '@context': 'https://schema.org',
          '@type': 'VideoObject',
          name: videoText(v, l),
          description: l === 'ar' ? v.descriptionAr : v.descriptionEn,
          thumbnailUrl: origin + assetUrl(v.slug, 'thumbnail'),
          uploadDate: v.publishedAt,
          duration: 'PT' + v.durationSeconds + 'S',
          contentUrl: origin + assetUrl(v.slug, 'playback'),
          inLanguage: l,
        }
      : null;
  return (
    <main id="home" className="public-shell">
      <article className="academy-detail">
        <Link href={'/' + l + '/health-academy'}>← {d.title}</Link>
        <p className="academy-category">{videoText(v.category, l)}</p>
        {v.contentKind === 'REGULATED_PROMOTION' && <p>{d.promotion}</p>}
        <h1>{videoText(v, l)}</h1>
        <div className="academy-meta">
          {v.authorName && <span>{v.authorName} · </span>}
          <Link href={'/' + l + '/branches/' + v.branch.slug}>
            {l === 'ar' ? v.branch.nameAr : v.branch.nameEn}
          </Link>{' '}
          ·{' '}
          <time dateTime={v.publishedAt}>
            {new Date(v.publishedAt).toLocaleDateString(
              l === 'ar' ? 'ar-SA' : 'en-GB',
              { timeZone: 'Asia/Riyadh' },
            )}
          </time>
        </div>
        <AcademyPlayer video={v} locale={l} />
        <p className="academy-description">
          {l === 'ar' ? v.descriptionAr : v.descriptionEn}
        </p>
        <aside className="academy-disclaimer">{d.disclaimer}</aside>
        <section className="academy-references">
          <h2>{d.references}</h2>
          <ul>
            {v.references.map((r, i) => (
              <li key={i}>
                <a href={r.sourceUrl} rel="noopener noreferrer" target="_blank">
                  {r.sourceTitle} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
        {related.items.some((r) => r.id !== v.id) && (
          <section>
            <h2>{d.related}</h2>
            <div className="academy-grid">
              {related.items
                .filter((r) => r.id !== v.id)
                .slice(0, 2)
                .map((r) => (
                  <VideoCard key={r.id} video={r} locale={l} />
                ))}
            </div>
          </section>
        )}
      </article>
      {structured && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structured).replace(/</g, '\\u003c'),
          }}
        />
      )}
    </main>
  );
}
