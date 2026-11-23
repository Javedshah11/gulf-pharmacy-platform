import Link from 'next/link';
import type { Locale } from '@/lib/utils/locale';
import { dictionary } from '@/features/localization/dictionaries';
import { PublicIcon } from '@/components/ui/public-icons';
export function InformationPage({
  locale,
  kind,
}: {
  locale: Locale;
  kind: 'about' | 'privacy' | 'terms';
}) {
  const d = dictionary(locale);
  const about = kind === 'about';
  return (
    <main id="home" className="public-shell public-page">
      <div className="public-page-heading">
        <p className="public-eyebrow">
          {about ? d.aboutEyebrow : 'GULF PHARMACY · صيدلية الخليج'}
        </p>
        <h1>
          {about
            ? d.aboutPageTitle
            : kind === 'privacy'
              ? d.privacyTitle
              : d.termsTitle}
        </h1>
        <p>
          {about
            ? d.aboutPageIntro
            : kind === 'privacy'
              ? d.privacyIntro
              : d.termsIntro}
        </p>
      </div>
      {about ? (
        <>
          <div className="public-principles">
            {[
              {
                title: d.aboutPrinciple1,
                text: d.aboutPrinciple1Text,
                icon: 'pin' as const,
              },
              {
                title: d.aboutPrinciple2,
                text: d.aboutPrinciple2Text,
                icon: 'chat' as const,
              },
              {
                title: d.aboutPrinciple3,
                text: d.aboutPrinciple3Text,
                icon: 'cross' as const,
              },
            ].map((item) => (
              <section key={item.title}>
                <span className="public-icon-box">
                  <PublicIcon name={item.icon} />
                </span>
                <h2>{item.title}</h2>
                <p>{item.text}</p>
              </section>
            ))}
          </div>
          <Link className="public-button" href={'/' + locale + '/branches'}>
            {d.findBranch}
          </Link>
        </>
      ) : (
        <article className="public-prose">
          <p>{kind === 'privacy' ? d.privacyBody : d.termsBody}</p>
          {kind === 'privacy' && (
            <>
              <h2>
                {locale === 'ar'
                  ? 'المساعد الآلي والتحديثات الاختيارية'
                  : 'Automated assistant and optional updates'}
              </h2>
              <p>
                {locale === 'ar'
                  ? 'المساعد آلي وليس مختصاً صحياً. لا تشاركوا معلومات صحية أو شخصية في الأسئلة؛ لا نخزّن نص المحادثات. نسجّل إشارات تفاعل إجمالية مع منع التكرار المؤقت دون ملفات صحية أو تتبع GPS. طلب تحديثات واتساب اختياري ولا يُؤكد إلا بعد التحقق من رسالة واردة من رقمكم. تُشفّر أرقام التواصل وتظهر للموظفين بصورة محجوبة. يمكن سحب الموافقة عبر رابط الإدارة الخاص أو الفرع، ويُمنع الإرسال فوراً. لا توجد رسائل تسويقية آلية مفعّلة.'
                  : 'The assistant is automated and is not a healthcare professional. Avoid sharing health or personal information; conversation text is not stored. We record aggregate engagement signals with temporary repeat prevention, without health profiles or GPS tracking. WhatsApp updates are optional and require verification of an incoming message from your number. Contact numbers are encrypted and masked to staff. Withdraw through your private management link or the branch for immediate suppression. Automated marketing sending is disabled.'}
              </p>
              <p>
                {locale === 'ar'
                  ? 'مدة الاحتفاظ الافتراضية لإشارات التفاعل وبيانات الطلبات غير المؤكدة أو المنسحبة 180 يوماً، وتُطبق عبر أداة الاحتفاظ الإدارية. تُحتفظ أدلة الموافقة والمنع وفق جدول احتفاظ يراجعه النشاط قبل التشغيل الفعلي.'
                  : 'The default retention window for engagement signals and unverified or withdrawn contact data is 180 days, applied through the administrator retention tool. Consent and suppression evidence is retained under a business-reviewed retention schedule before live operation.'}
              </p>
              <Link href={'/' + locale + '/updates'}>
                {locale === 'ar'
                  ? 'التحديثات الاختيارية وإدارة الانسحاب'
                  : 'Optional updates and withdrawal management'}
              </Link>
            </>
          )}
          <Link className="public-text-link" href={'/' + locale + '/contact'}>
            {d.contact}
          </Link>
        </article>
      )}
    </main>
  );
}
