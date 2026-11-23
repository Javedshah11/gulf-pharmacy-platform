import Link from 'next/link';
import { academyCategories, academyVideos } from '@/lib/api/academy';
import { requireLocale } from '@/features/localization/locale';
import {
  academyText,
  VideoCard,
  videoText,
} from '@/features/health-academy/academy';
import { pageMetadata } from '@/lib/seo/site';
import './academy.css';
type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
export async function generateMetadata({ params }: Props) {
  const l = requireLocale((await params).locale);
  return pageMetadata(
    l,
    '/health-academy',
    academyText[l].title,
    academyText[l].intro,
  );
}
export default async function Academy({ params, searchParams }: Props) {
  const l = requireLocale((await params).locale),
    d = academyText[l],
    q = await searchParams;
  const query = new URLSearchParams();
  for (const k of ['search', 'category', 'branch', 'page'])
    if (typeof q[k] === 'string') query.set(k, q[k]);
  let data, categories;
  try {
    [data, categories] = await Promise.all([
      academyVideos(query.toString()),
      academyCategories(),
    ]);
  } catch {
    return (
      <main id="home" className="public-shell academy-main">
        <h1>{d.title}</h1>
        <p role="alert">{d.unavailable}</p>
        <Link href={'/' + l + '/health-academy'}>
          {l === 'ar' ? 'إعادة المحاولة' : 'Try again'}
        </Link>
      </main>
    );
  }
  const pageLink = (page: number) => {
    const next = new URLSearchParams(query);
    next.set('page', String(page));
    return '?' + next;
  };
  return (
    <main id="home">
      <section className="academy-hero">
        <div className="public-shell">
          <p className="academy-eyebrow">{d.eyebrow}</p>
          <h1>{d.title}</h1>
          <p>{d.intro}</p>
        </div>
      </section>
      <div className="public-shell academy-main">
        <form className="academy-filters" method="get">
          <label>
            {d.search}
            <input
              type="search"
              name="search"
              maxLength={200}
              defaultValue={query.get('search') ?? ''}
            />
          </label>
          <label>
            {l === 'ar' ? 'التصنيف' : 'Category'}
            <select name="category" defaultValue={query.get('category') ?? ''}>
              <option value="">{d.all}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {videoText(c, l)}
                </option>
              ))}
            </select>
          </label>
          <button className="public-button" type="submit">
            {l === 'ar' ? 'بحث' : 'Search'}
          </button>
        </form>
        {data.items.length ? (
          <>
            <p>
              {data.total} {d.results}
            </p>
            <div className="academy-grid">
              {data.items.map((v) => (
                <VideoCard key={v.id} video={v} locale={l} />
              ))}
            </div>
            <nav
              className="academy-pagination"
              aria-label={l === 'ar' ? 'الصفحات' : 'Pagination'}
            >
              {data.page > 1 && (
                <Link href={pageLink(data.page - 1)}>{d.previous}</Link>
              )}
              <span>{data.page}</span>
              {data.page * data.pageSize < data.total && (
                <Link href={pageLink(data.page + 1)}>{d.next}</Link>
              )}
            </nav>
          </>
        ) : (
          <div className="academy-empty">
            <span aria-hidden="true">▷</span>
            <h2>{d.empty}</h2>
            <p>{d.emptyText}</p>
            <Link className="public-button" href={'/' + l + '/branches'}>
              {l === 'ar' ? 'ابحث عن فرعك' : 'Find your branch'}
            </Link>
          </div>
        )}
        <aside className="academy-disclaimer">{d.disclaimer}</aside>
      </div>
    </main>
  );
}
