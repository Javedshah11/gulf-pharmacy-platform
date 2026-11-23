import { requireLocale } from '@/features/localization/locale';
import { SubscriptionForm } from '@/features/engagement/subscription';
import { listPublicBranches } from '@/lib/api/public-branches';
import { publicFaqs } from '@/lib/api/engagement';
export const metadata = {
  robots: { index: false, follow: true },
  title: 'Gulf Pharmacy — Optional updates',
};
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ branch?: string; qr?: string }>;
}) {
  const l = requireLocale((await params).locale),
    q = await searchParams;
  const [branches, faqs] = await Promise.all([
    listPublicBranches(),
    publicFaqs(q.branch),
  ]);
  return (
    <main id="home" className="public-shell engagement-page">
      <p className="engagement-eyebrow">
        {l === 'ar' ? 'اختياركم أولاً' : 'YOUR CHOICE COMES FIRST'}
      </p>
      <h1>
        {l === 'ar'
          ? 'ابقوا على تواصل باختياركم'
          : 'Stay connected, on your terms'}
      </h1>
      <SubscriptionForm
        branches={branches}
        locale={l}
        initialBranch={q.branch}
        qrCode={q.qr}
      />
      {faqs.length > 0 && (
        <section className="engagement-panel">
          <h2>{l === 'ar' ? 'معلومات معتمدة' : 'Approved information'}</h2>
          {faqs.map((f) => (
            <article key={f.id} id={'faq-' + f.id}>
              <h3>{l === 'ar' ? f.questionAr : f.questionEn}</h3>
              <p>{l === 'ar' ? f.answerAr : f.answerEn}</p>
            </article>
          ))}
        </section>
      )}
      <a href={'/' + l + '/privacy'}>
        {l === 'ar'
          ? 'الخصوصية وإشعار التحديثات'
          : 'Privacy and updates notice'}
      </a>
    </main>
  );
}
