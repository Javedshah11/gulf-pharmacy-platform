import Link from 'next/link';
import type { AcademyVideo } from '@gulf/shared';
import type { Locale } from '@/lib/utils/locale';
export const academyText = {
  en: {
    title: 'Gulf Health Academy',
    eyebrow: 'LEARN. UNDERSTAND. CARE.',
    intro: 'Health education, thoughtfully reviewed by our pharmacy team.',
    all: 'All categories',
    search: 'Search videos',
    browse: 'Explore the Academy',
    empty: 'Our video library is being prepared.',
    emptyText:
      'Reviewed educational videos will appear here after approval. You can contact your branch in the meantime.',
    disclaimer:
      'For educational purposes only. This content does not replace advice from a qualified healthcare professional, diagnosis, or a prescription. Contact your pharmacist or doctor for advice specific to you.',
    references: 'Supporting references',
    related: 'Continue learning',
    branch: 'From our branch',
    minutes: 'min',
    unavailable:
      'The Academy is temporarily unavailable. Please try again shortly.',
    previous: 'Previous',
    next: 'Next',
    results: 'videos',
    promotion: 'Authorized promotional content',
  },
  ar: {
    title: 'أكاديمية الخليج الصحية',
    eyebrow: 'تعلّم. افهم. اعتنِ بصحتك.',
    intro: 'توعية صحية يراجعها فريق الصيدلية بعناية.',
    all: 'جميع التصنيفات',
    search: 'البحث عن فيديو',
    browse: 'استكشف الأكاديمية',
    empty: 'نعمل على إعداد مكتبة الفيديو.',
    emptyText:
      'ستظهر الفيديوهات التوعوية هنا بعد مراجعتها واعتمادها. يمكنكم التواصل مع فرعكم في هذه الأثناء.',
    disclaimer:
      'هذا المحتوى للتثقيف فقط، ولا يحل محل استشارة مختص صحي مؤهل أو التشخيص أو الوصفة الطبية. استشيروا الصيدلي أو الطبيب للحصول على المشورة المناسبة لحالتكم.',
    references: 'المراجع الداعمة',
    related: 'واصل التعلّم',
    branch: 'من فرعنا',
    minutes: 'دقيقة',
    unavailable: 'الأكاديمية غير متاحة مؤقتاً. يرجى المحاولة لاحقاً.',
    previous: 'السابق',
    next: 'التالي',
    results: 'فيديو',
    promotion: 'محتوى ترويجي مصرّح به',
  },
};
export const videoText = (
  v: { titleEn: string; titleAr: string },
  l: Locale,
) => (l === 'ar' ? v.titleAr : v.titleEn);
export const assetUrl = (slug: string, type: string) =>
  '/media/health-academy/' + encodeURIComponent(slug) + '/' + type;
export function VideoCard({
  video: v,
  locale: l,
}: {
  video: AcademyVideo;
  locale: Locale;
}) {
  return (
    <article className="academy-card">
      <Link
        href={`/${l}/health-academy/${v.slug}`}
        className="academy-card-image"
        aria-label={videoText(v, l)}
      >
        {v.hasThumbnail ? (
          <img
            src={assetUrl(v.slug, 'thumbnail')}
            alt=""
            loading="lazy"
            width={640}
            height={360}
          />
        ) : (
          <span aria-hidden="true">▷</span>
        )}
        <span className="academy-duration">
          {Math.floor(v.durationSeconds / 60)}:
          {String(v.durationSeconds % 60).padStart(2, '0')}
        </span>
      </Link>
      <div className="academy-card-body">
        <p className="academy-category">{videoText(v.category, l)}</p>
        <h2>
          <Link href={`/${l}/health-academy/${v.slug}`}>{videoText(v, l)}</Link>
        </h2>
        <p>{l === 'ar' ? v.branch.nameAr : v.branch.nameEn}</p>
      </div>
    </article>
  );
}
