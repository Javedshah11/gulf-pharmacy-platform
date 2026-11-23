'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Branch, StaffAccount } from '@gulf/shared';
import { useAdmin, useText } from '@/features/admin/provider';
import { useResource } from '@/features/admin/use-resource';
import {
  Field,
  PageTitle,
  ErrorState,
  LoadingState,
  messageOf,
} from '@/features/admin/ui';
type Content = {
  id: string;
  branchId: string;
  authorId: string;
  revision: number;
  status: string;
  reviewerId: string | null;
  medicalRevision: number | null;
  complianceRevision: number | null;
  slug?: string;
  titleEn?: string;
  titleAr?: string;
  bodyEn?: string;
  bodyAr?: string;
  campaignType?: string;
  startsAt?: string;
  endsAt?: string;
  questionEn?: string;
  questionAr?: string;
  answerEn?: string;
  answerAr?: string;
  videoId: string | null;
  reviews?: {
    id: string;
    kind: string;
    decision: string;
    comments: string;
    revision: number;
    createdAt: string;
  }[];
};
type Qr = {
  id: string;
  code: string;
  label: string;
  branchId: string;
  destination: string;
  source: string;
  isActive: boolean;
};
const path = '/admin/engagement/';
const adminApi = (url: string) =>
  new URL(
    '/api/admin/engagement/' + url,
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  );
async function download(url: string, name: string) {
  const response = await fetch(adminApi(url), {
    credentials: 'include',
    cache: 'no-store',
  });
  if (!response.ok)
    throw new Error('Download is not authorized or unavailable');
  const blob = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = blob;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(blob), 1000);
}
export function MarketingHub() {
  const { user } = useAdmin(),
    t = useText();
  return (
    <>
      <PageTitle
        eyebrow={t('GULF PHARMACY', 'صيدلية الخليج')}
        title={t('Customer engagement', 'تواصل العملاء')}
        description={t(
          'Reviewed information, voluntary contact and aggregate signals. Outbound marketing is disabled.',
          'معلومات مراجعة وتواصل طوعي وإشارات إجمالية. إرسال التسويق معطّل.',
        )}
      />
      <div className="admin-staff-grid">
        {[
          {
            url: '/admin/marketing/campaigns',
            en: 'Campaigns & reviews',
            ar: 'الحملات والمراجعات',
          },
          {
            url: '/admin/assistant',
            en: 'Assistant knowledge',
            ar: 'معرفة المساعد',
          },
          ...(['SUPER_ADMIN', 'BRANCH_ADMIN'].includes(user?.role ?? '')
            ? [
                {
                  url: '/admin/marketing/qr',
                  en: 'Branch QR codes',
                  ar: 'رموز الفروع',
                },
                {
                  url: '/admin/marketing/subscriptions',
                  en: 'Consent & subscriptions',
                  ar: 'الموافقة والاشتراكات',
                },
                {
                  url: '/admin/marketing/analytics',
                  en: 'Aggregate analytics',
                  ar: 'التحليلات الإجمالية',
                },
                {
                  url: '/admin/marketing/messaging',
                  en: 'WhatsApp setup',
                  ar: 'إعداد واتساب',
                },
              ]
            : []),
        ].map((link) => (
          <Link className="admin-panel" key={link.url} href={link.url}>
            <h2>{t(link.en, link.ar)} ↗</h2>
          </Link>
        ))}
      </div>
    </>
  );
}
export function ContentWorkspace({
  kind,
  id,
}: {
  kind: 'campaigns' | 'faqs';
  id?: string;
}) {
  const { user, request, locale } = useAdmin(),
    t = useText(),
    router = useRouter();
  const list = useResource<Content[]>(id ? null : path + kind),
    detail = useResource<Content>(id ? path + kind + '/' + id : null),
    branches = useResource<Branch[]>('/admin/academy/branches'),
    staff = useResource<StaffAccount[]>(
      user?.role === 'SUPER_ADMIN' ? '/admin/users' : null,
    ),
    videos = useResource<{
      items: { id: string; titleEn: string; titleAr: string; status: string }[];
    }>('/admin/videos');
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [success, setSuccess] = useState('');
  const row = detail.data;
  const canEdit =
    user?.role !== 'MEDICAL_REVIEWER' &&
    (!row || !['PENDING_REVIEW', 'COMPLETED', 'ARCHIVED'].includes(row.status));
  async function action(action: string, body: unknown = {}) {
    setBusy(true);
    setError('');
    try {
      await request(path + kind + '/' + id + '/' + action, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setSuccess(t('Saved.', 'تم الحفظ.'));
      await detail.reload();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  if (detail.loading || list.loading || branches.loading)
    return <LoadingState />;
  if (detail.error || list.error || branches.error)
    return (
      <ErrorState message={detail.error || list.error || branches.error} />
    );
  const label =
    kind === 'campaigns'
      ? t('Campaigns', 'الحملات')
      : t('Assistant knowledge', 'معرفة المساعد');
  const fields =
    kind === 'campaigns'
      ? ['titleEn', 'titleAr', 'bodyEn', 'bodyAr']
      : ['questionEn', 'questionAr', 'answerEn', 'answerAr'];
  return (
    <>
      <PageTitle
        eyebrow={t('CUSTOMER ENGAGEMENT', 'تواصل العملاء')}
        title={
          row
            ? ((locale === 'ar'
                ? (row.titleAr ?? row.questionAr)
                : (row.titleEn ?? row.questionEn)) ?? label)
            : label
        }
        description={t(
          'Independent medical and compliance approvals are required for each revision. Changes immediately remove public access.',
          'يلزم اعتماد طبي وامتثال مستقل لكل نسخة. التغييرات توقف الظهور العام فوراً.',
        )}
      />
      <Link href="/admin/marketing">
        ← {t('Customer engagement', 'تواصل العملاء')}
      </Link>
      {error && <ErrorState message={error} />}
      {success && (
        <p className="admin-success" role="status">
          {success}
        </p>
      )}
      {row && (
        <section className="admin-panel">
          <strong>
            {row.status} · {t('Revision', 'النسخة')} {row.revision}
          </strong>
          <p>
            {t('Medical revision', 'النسخة الطبية')}:{' '}
            {row.medicalRevision ?? '—'} ·{' '}
            {t('Compliance revision', 'نسخة الامتثال')}:{' '}
            {row.complianceRevision ?? '—'}
          </p>
          <div className="admin-actions">
            {['DRAFT', 'CHANGES_REQUESTED', 'REJECTED'].includes(row.status) &&
              user?.role !== 'MEDICAL_REVIEWER' && (
                <button
                  className="admin-button"
                  disabled={busy}
                  onClick={() => void action('submit')}
                >
                  {t('Submit for review', 'إرسال للمراجعة')}
                </button>
              )}
            {user?.role === 'SUPER_ADMIN' && (
              <button
                className="admin-button"
                disabled={busy || row.status !== 'APPROVED'}
                onClick={() => void action('publish')}
              >
                {t('Publish / schedule', 'نشر / جدولة')}
              </button>
            )}
            {['SUPER_ADMIN', 'BRANCH_ADMIN'].includes(user?.role ?? '') &&
              ['ACTIVE', 'SCHEDULED', 'PUBLISHED', 'PAUSED'].includes(
                row.status,
              ) && (
                <button
                  className="admin-button secondary"
                  disabled={busy}
                  onClick={() => void action('pause')}
                >
                  {t('Pause / archive', 'إيقاف / أرشفة')}
                </button>
              )}
          </div>
          {!canEdit &&
            fields.map((field) => (
              <p className="video-multiline" key={field}>
                {String(row[field as keyof Content] ?? '')}
              </p>
            ))}
        </section>
      )}
      {canEdit && (
        <form
          className="admin-panel"
          key={(row?.id ?? 'new') + '-' + (row?.revision ?? 0)}
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            const f = new FormData(e.currentTarget);
            try {
              const body: Record<string, unknown> = {
                branchId: f.get('branchId'),
                videoId: f.get('videoId') || null,
              };
              for (const field of fields) body[field] = f.get(field);
              if (kind === 'campaigns') {
                body.slug = f.get('slug');
                body.campaignType = f.get('campaignType');
                body.startsAt = new Date(
                  String(f.get('startsAt')),
                ).toISOString();
                body.endsAt = new Date(String(f.get('endsAt'))).toISOString();
              }
              const saved = await request<Content>(
                path + kind + (id ? '/' + id : ''),
                { method: id ? 'PUT' : 'POST', body: JSON.stringify(body) },
              );
              if (id) await detail.reload();
              else
                router.push(
                  (kind === 'campaigns'
                    ? '/admin/marketing/campaigns/'
                    : '/admin/assistant/') + saved.id,
                );
            } catch (e) {
              setError(messageOf(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2>
            {row
              ? t('Revise content', 'تعديل المحتوى')
              : t('Create draft', 'إنشاء مسودة')}
          </h2>
          <div className="admin-form-grid">
            <Field label={t('Source branch', 'الفرع المصدر')}>
              <select
                name="branchId"
                required
                defaultValue={row?.branchId ?? ''}
              >
                <option value="">{t('Choose branch', 'اختر الفرع')}</option>
                {branches.data
                  ?.filter((b) => !row || row.branchId === b.id)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {t(b.nameEn, b.nameAr)}
                    </option>
                  ))}
              </select>
            </Field>
            {kind === 'campaigns' && (
              <>
                <Field label={t('URL slug', 'معرّف الرابط')}>
                  <input
                    name="slug"
                    required
                    maxLength={120}
                    pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                    defaultValue={row?.slug}
                  />
                </Field>
                <Field label={t('Campaign type', 'نوع الحملة')}>
                  <select
                    name="campaignType"
                    defaultValue={row?.campaignType ?? 'AWARENESS'}
                  >
                    {[
                      ['AWARENESS', 'Pharmacy awareness', 'التوعية بالصيدلية'],
                      ['EDUCATION', 'Approved education', 'تثقيف معتمد'],
                      ['ANNOUNCEMENT', 'Verified announcement', 'إعلان موثّق'],
                      ['PROMOTION', 'Regulated promotion', 'ترويج منظم'],
                    ].map(([v, en, ar]) => (
                      <option key={v} value={v}>
                        {t(en, ar)}
                      </option>
                    ))}
                  </select>
                </Field>
                {(['startsAt', 'endsAt'] as const).map((field) => (
                  <Field
                    key={field}
                    label={
                      field === 'startsAt'
                        ? t('Starts (local time)', 'البداية (التوقيت المحلي)')
                        : t('Ends (local time)', 'النهاية (التوقيت المحلي)')
                    }
                  >
                    <input
                      name={field}
                      type="datetime-local"
                      required
                      defaultValue={
                        row?.[field]
                          ? new Date(
                              new Date(row[field]!).getTime() -
                                new Date(row[field]!).getTimezoneOffset() *
                                  60000,
                            )
                              .toISOString()
                              .slice(0, 16)
                          : ''
                      }
                    />
                  </Field>
                ))}
              </>
            )}
            <Field
              label={t(
                'Approved Academy video (optional except education campaigns)',
                'فيديو أكاديمية معتمد (اختياري عدا الحملات التثقيفية)',
              )}
            >
              <select name="videoId" defaultValue={row?.videoId ?? ''}>
                <option value="">
                  {t('No linked video', 'دون فيديو مرتبط')}
                </option>
                {videos.data?.items
                  .filter((v) => v.status === 'PUBLISHED')
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {t(v.titleEn, v.titleAr)}
                    </option>
                  ))}
              </select>
            </Field>
          </div>
          {fields.map((field) => (
            <Field
              key={field}
              label={
                field === 'titleEn'
                  ? t('English title', 'العنوان بالإنجليزية')
                  : field === 'titleAr'
                    ? t('Arabic title', 'العنوان بالعربية')
                    : field === 'bodyEn'
                      ? t('English content', 'المحتوى بالإنجليزية')
                      : field === 'bodyAr'
                        ? t('Arabic content', 'المحتوى بالعربية')
                        : field === 'questionEn'
                          ? t('English question', 'السؤال بالإنجليزية')
                          : field === 'questionAr'
                            ? t('Arabic question', 'السؤال بالعربية')
                            : field === 'answerEn'
                              ? t('English answer', 'الإجابة بالإنجليزية')
                              : t('Arabic answer', 'الإجابة بالعربية')
              }
            >
              <textarea
                name={field}
                required
                maxLength={
                  field.startsWith('title')
                    ? 200
                    : field.startsWith('question')
                      ? 300
                      : kind === 'faqs'
                        ? 3000
                        : 5000
                }
                rows={
                  field.startsWith('title') || field.startsWith('question')
                    ? 2
                    : 5
                }
                dir={field.endsWith('Ar') ? 'rtl' : 'ltr'}
                defaultValue={String(row?.[field as keyof Content] ?? '')}
              />
            </Field>
          ))}
          <p>
            {t(
              'Do not invent claims, stock, prices, offers or professional identities.',
              'لا تختلقوا ادعاءات أو مخزوناً أو أسعاراً أو عروضاً أو هويات مهنية.',
            )}
          </p>
          <button className="admin-button" disabled={busy}>
            {t('Save draft', 'حفظ المسودة')}
          </button>
        </form>
      )}
      {row && user?.role === 'SUPER_ADMIN' && (
        <form
          className="admin-panel"
          onSubmit={(e) => {
            e.preventDefault();
            void action('assign', {
              reviewerId: new FormData(e.currentTarget).get('reviewerId'),
            });
          }}
        >
          <h2>{t('Assign independent reviewer', 'تعيين مراجع مستقل')}</h2>
          <Field label={t('Medical reviewer', 'المراجع الطبي')}>
            <select
              name="reviewerId"
              required
              defaultValue={row.reviewerId ?? ''}
            >
              <option value="">{t('Select reviewer', 'اختر المراجع')}</option>
              {staff.data
                ?.filter(
                  (s) =>
                    s.role === 'MEDICAL_REVIEWER' &&
                    s.isActive &&
                    s.branchIds.includes(row.branchId) &&
                    s.id !== row.authorId,
                )
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.displayName}
                  </option>
                ))}
            </select>
          </Field>
          <button className="admin-button" disabled={busy}>
            {t('Assign reviewer', 'تعيين المراجع')}
          </button>
        </form>
      )}
      {row &&
        ((user?.role === 'MEDICAL_REVIEWER' &&
          row.status === 'PENDING_REVIEW') ||
          (user?.role === 'SUPER_ADMIN' &&
            [
              'PENDING_REVIEW',
              'APPROVED',
              'ACTIVE',
              'SCHEDULED',
              'PUBLISHED',
              'PAUSED',
            ].includes(row.status))) && (
          <form
            className="admin-panel"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const body: Record<string, unknown> = {
                kind:
                  user?.role === 'MEDICAL_REVIEWER' ? 'MEDICAL' : 'COMPLIANCE',
                decision: f.get('decision'),
                comments: f.get('comments'),
              };
              if (f.get('approvalReference'))
                body.approvalReference = f.get('approvalReference');
              if (f.get('validUntil'))
                body.validUntil = new Date(
                  String(f.get('validUntil')),
                ).toISOString();
              void action('review', body);
            }}
          >
            <h2>
              {user?.role === 'MEDICAL_REVIEWER'
                ? t('Medical decision', 'القرار الطبي')
                : t('Compliance decision', 'قرار الامتثال')}
            </h2>
            <Field label={t('Decision', 'القرار')}>
              <select name="decision">
                <option value="APPROVE">{t('Approve', 'اعتماد')}</option>
                <option value="CHANGES_REQUESTED">
                  {t('Request changes', 'طلب تعديلات')}
                </option>
                <option value="REJECT">{t('Reject', 'رفض')}</option>
                {user?.role === 'SUPER_ADMIN' &&
                  row.campaignType !== 'PROMOTION' && (
                    <option value="NOT_REQUIRED">
                      {t(
                        'No regulated authorization required',
                        'لا يلزم تصريح تنظيمي',
                      )}
                    </option>
                  )}
              </select>
            </Field>
            <Field label={t('Review notes', 'ملاحظات المراجعة')}>
              <textarea name="comments" required maxLength={5000} />
            </Field>
            {user?.role === 'SUPER_ADMIN' && (
              <>
                <Field label={t('Authorization reference', 'مرجع التصريح')}>
                  <input name="approvalReference" maxLength={300} />
                </Field>
                <Field
                  label={t('Authorization valid until', 'صلاحية التصريح حتى')}
                >
                  <input name="validUntil" type="datetime-local" />
                </Field>
              </>
            )}
            <button className="admin-button" disabled={busy}>
              {t('Record decision', 'تسجيل القرار')}
            </button>
          </form>
        )}
      {row && (
        <section className="admin-panel">
          <h2>{t('Publication and review history', 'سجل النشر والمراجعة')}</h2>
          {row.reviews?.length ? (
            row.reviews.map((r) => (
              <article className="video-list-row" key={r.id}>
                <div>
                  <strong>
                    {r.kind} · {r.decision} · {r.revision}
                  </strong>
                  <p className="video-multiline">{r.comments}</p>
                  <time>{new Date(r.createdAt).toLocaleString(locale)}</time>
                </div>
              </article>
            ))
          ) : (
            <p>{t('No decisions recorded.', 'لا توجد قرارات مسجلة.')}</p>
          )}
        </section>
      )}
      {!id && (
        <section className="admin-panel">
          <h2>{t('Authorized content', 'المحتوى المصرّح به')}</h2>
          {list.data?.length ? (
            list.data.map((c) => (
              <article className="video-list-row" key={c.id}>
                <Link
                  href={
                    (kind === 'campaigns'
                      ? '/admin/marketing/campaigns/'
                      : '/admin/assistant/') + c.id
                  }
                >
                  {locale === 'ar'
                    ? (c.titleAr ?? c.questionAr)
                    : (c.titleEn ?? c.questionEn)}
                </Link>
                <span>
                  {c.status} · {c.revision}
                </span>
              </article>
            ))
          ) : (
            <p>{t('No content created yet.', 'لم يُنشأ محتوى بعد.')}</p>
          )}
        </section>
      )}
    </>
  );
}
export function QrWorkspace() {
  const { request, locale } = useAdmin(),
    t = useText();
  const list = useResource<Qr[]>(path + 'qr'),
    branches = useResource<Branch[]>('/admin/academy/branches'),
    campaigns = useResource<Content[]>(path + 'campaigns');
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  if (list.loading || branches.loading) return <LoadingState />;
  if (list.error || branches.error)
    return <ErrorState message={list.error || branches.error} />;
  return (
    <>
      <PageTitle
        eyebrow={t('CUSTOMER ENGAGEMENT', 'تواصل العملاء')}
        title={t('Branch QR codes', 'رموز الفروع')}
        description={t(
          'Printable PNG and SVG. Direct WhatsApp/Maps QR codes cannot identify visitors or subscribe them. Website QR codes record anonymous aggregate signals.',
          'صور PNG وSVG للطباعة. رموز واتساب والخرائط المباشرة لا تحدد هوية الزائر أو تشترك به. رموز الموقع تسجل إشارات إجمالية مجهولة.',
        )}
      />
      {error && <ErrorState message={error} />}
      <form
        className="admin-panel"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget,
            f = new FormData(form);
          setBusy(true);
          setError('');
          try {
            await request(path + 'qr', {
              method: 'POST',
              body: JSON.stringify({
                branchId: f.get('branchId'),
                campaignId: f.get('campaignId') || null,
                label: f.get('label'),
                destination: f.get('destination'),
                source: f.get('source'),
              }),
            });
            form.reset();
            await list.reload();
          } catch (e) {
            setError(messageOf(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="admin-form-grid">
          <Field label={t('Branch', 'الفرع')}>
            <select required name="branchId">
              <option value="">{t('Choose branch', 'اختر الفرع')}</option>
              {branches.data?.map((b) => (
                <option key={b.id} value={b.id}>
                  {t(b.nameEn, b.nameAr)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('QR label', 'اسم الرمز')}>
            <input required name="label" maxLength={160} />
          </Field>
          <Field label={t('Destination', 'الوجهة')}>
            <select name="destination">
              <option value="WEBSITE">
                {t('Welcome page', 'صفحة الترحيب')}
              </option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="MAPS">Google Maps</option>
            </select>
          </Field>
          <Field label={t('Placement source', 'موضع الرمز')}>
            <select name="source">
              {[
                ['BUSINESS_CARD', 'Business card', 'بطاقة العمل'],
                ['COUNTER', 'Pharmacy counter', 'كاونتر الصيدلية'],
                ['BAG', 'Product bag', 'كيس المنتجات'],
                ['POSTER', 'Poster', 'ملصق'],
                ['EVENT', 'Community event', 'فعالية مجتمعية'],
              ].map(([v, en, ar]) => (
                <option key={v} value={v}>
                  {t(en, ar)}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label={t(
              'Linked campaign (optional)',
              'الحملة المرتبطة (اختيارية)',
            )}
          >
            <select name="campaignId">
              <option value="">{t('No campaign', 'دون حملة')}</option>
              {campaigns.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {t(c.titleEn ?? '', c.titleAr ?? '')}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <button className="admin-button" disabled={busy}>
          {t('Generate branch QR', 'إنشاء رمز الفرع')}
        </button>
      </form>
      <div className="admin-panel">
        {list.data?.length ? (
          list.data.map((q) => (
            <article className="video-list-row" key={q.id}>
              <div>
                <strong>{q.label}</strong>
                <p>
                  {q.destination} · {q.source} ·{' '}
                  {q.isActive ? t('Enabled', 'مفعّل') : t('Disabled', 'معطّل')}
                </p>
                <Link href={'/' + locale + '/scan/' + q.code}>
                  {t('Open welcome page', 'فتح صفحة الترحيب')}
                </Link>
              </div>
              <div className="admin-actions">
                {['png', 'svg'].map((format) => (
                  <button
                    className="admin-button secondary"
                    key={format}
                    onClick={() =>
                      void download(
                        'qr/' +
                          q.id +
                          '/image?format=' +
                          format +
                          '&locale=' +
                          locale,
                        'gulf-' + q.code + '.' + format,
                      ).catch((e) => setError(messageOf(e)))
                    }
                  >
                    {t('Download', 'تنزيل')} {format.toUpperCase()}
                  </button>
                ))}
                <button
                  className="admin-button secondary"
                  onClick={async () => {
                    try {
                      await request(path + 'qr/' + q.id, {
                        method: 'PATCH',
                        body: JSON.stringify({ isActive: !q.isActive }),
                      });
                      await list.reload();
                    } catch (e) {
                      setError(messageOf(e));
                    }
                  }}
                >
                  {q.isActive
                    ? t('Disable website resolution', 'تعطيل صفحة الرمز')
                    : t('Enable website resolution', 'تفعيل صفحة الرمز')}
                </button>
              </div>
            </article>
          ))
        ) : (
          <p>{t('No QR codes generated yet.', 'لم تُنشأ رموز بعد.')}</p>
        )}
      </div>
    </>
  );
}
export function AnalyticsWorkspace() {
  const { locale } = useAdmin(),
    t = useText();
  const [query, setQuery] = useState(''),
    [error, setError] = useState('');
  const report = useResource<{
    from: string;
    to: string;
    rows: {
      branchId: string | null;
      campaignId: string | null;
      source: string;
      eventType: string;
      count: number;
    }[];
    videoContacts: { eventType: string; count: number }[];
    definition: string;
  }>(path + 'analytics' + (query ? '?' + query : ''));
  const branches = useResource<Branch[]>('/admin/academy/branches'),
    campaigns = useResource<Content[]>(path + 'campaigns');
  const labels: Record<string, [string, string]> = {
    VISIT: ['Website visits', 'زيارات الموقع'],
    QR_SCAN: ['QR landing visits', 'زيارات صفحات الرموز'],
    WHATSAPP: ['WhatsApp clicks', 'نقرات واتساب'],
    DIRECTIONS: ['Directions clicks', 'نقرات الاتجاهات'],
    CALL: ['Call clicks', 'نقرات الاتصال'],
    ASSISTANT: ['Assistant interactions', 'تفاعلات المساعد'],
    VIDEO_CONTACT: ['Video contact clicks', 'تواصل من الفيديو'],
    CAMPAIGN_VIEW: ['Campaign engagement', 'تفاعل الحملات'],
  };
  return (
    <>
      <PageTitle
        eyebrow={t('CUSTOMER ENGAGEMENT', 'تواصل العملاء')}
        title={t('Aggregate acquisition signals', 'إشارات الاكتساب الإجمالية')}
        description={t(
          'Recorded signals, not unique people or confirmed in-store purchases. No health profiles or GPS tracking.',
          'إشارات مسجلة وليست أشخاصاً فريدين أو مشتريات مؤكدة داخل الفرع. دون ملفات صحية أو تتبع GPS.',
        )}
      />
      {(error || report.error) && (
        <ErrorState message={error || report.error} />
      )}
      <form
        className="admin-panel admin-form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget),
            q = new URLSearchParams();
          for (const k of ['branchId', 'campaignId', 'from', 'to'])
            if (f.get(k)) q.set(k, String(f.get(k)));
          setQuery(q.toString());
        }}
      >
        <Field label={t('Branch filter', 'تصفية الفرع')}>
          <select name="branchId">
            <option value="">
              {t('All authorized branches', 'جميع الفروع المصرّح بها')}
            </option>
            {branches.data?.map((b) => (
              <option key={b.id} value={b.id}>
                {t(b.nameEn, b.nameAr)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('Campaign filter', 'تصفية الحملة')}>
          <select name="campaignId">
            <option value="">
              {t('All authorized campaigns', 'جميع الحملات المصرّح بها')}
            </option>
            {campaigns.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {t(c.titleEn ?? '', c.titleAr ?? '')}
              </option>
            ))}
          </select>
        </Field>
        {(['from', 'to'] as const).map((k) => (
          <Field
            key={k}
            label={
              k === 'from'
                ? t('From date', 'من تاريخ')
                : t('To date', 'إلى تاريخ')
            }
          >
            <input name={k} type="date" />
          </Field>
        ))}
        <button className="admin-button">
          {t('Apply filters', 'تطبيق التصفية')}
        </button>
      </form>
      {report.loading ? (
        <LoadingState />
      ) : (
        <>
          <div className="video-counts">
            {Object.entries(labels).map(([key, words]) => (
              <div className="admin-panel" key={key}>
                <strong>
                  {report.data?.rows
                    .filter((r) => r.eventType === key)
                    .reduce((n, r) => n + r.count, 0) ?? 0}
                </strong>
                <span>{t(...words)}</span>
              </div>
            ))}
          </div>
          <section className="admin-panel">
            <h2>{t('Observed funnel', 'مسار التفاعل المرصود')}</h2>
            <p>
              {t(
                'Visits → QR/campaign engagement → contact clicks. Counts are independent aggregate events; they are not a linked personal journey or confirmed sales.',
                'زيارات ← تفاعل الرموز والحملات ← نقرات التواصل. الأعداد أحداث إجمالية مستقلة، وليست رحلة شخصية مترابطة أو مبيعات مؤكدة.',
              )}
            </p>
            {report.data?.rows.length ? (
              <ul>
                {report.data.rows.map((r, i) => (
                  <li key={i}>
                    {branches.data?.find((b) => b.id === r.branchId)?.[
                      locale === 'ar' ? 'nameAr' : 'nameEn'
                    ] ?? t('Network / unattributed', 'الشبكة / غير منسوب')}{' '}
                    · {r.source} ·{' '}
                    {labels[r.eventType]
                      ? t(...labels[r.eventType])
                      : r.eventType}
                    : <strong>{r.count}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                {t(
                  'No engagement has been recorded for these filters.',
                  'لم يُسجل تفاعل لهذه التصفية.',
                )}
              </p>
            )}
            <p>
              {t('Academy contact signals', 'إشارات التواصل من الأكاديمية')}:{' '}
              {report.data?.videoContacts.reduce((n, r) => n + r.count, 0) ?? 0}
            </p>
            <button
              className="admin-button secondary"
              onClick={() =>
                void download(
                  'analytics.csv' + (query ? '?' + query : ''),
                  'gulf-aggregate-analytics.csv',
                ).catch((e) => setError(messageOf(e)))
              }
            >
              {t('Export aggregate CSV', 'تصدير CSV إجمالي')}
            </button>
          </section>
        </>
      )}
    </>
  );
}
type SubscriptionRow = {
  id: string;
  subscriptionId: string;
  branchId: string;
  state: string;
  contactMasked: string;
  confirmed: boolean;
  scopes: string[];
};
export function SubscriptionsWorkspace() {
  const { request, user } = useAdmin(),
    t = useText();
  const list = useResource<SubscriptionRow[]>(path + 'subscriptions');
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <>
      <PageTitle
        eyebrow={t('CUSTOMER ENGAGEMENT', 'تواصل العملاء')}
        title={t('Consent & subscriptions', 'الموافقة والاشتراكات')}
        description={t(
          'Unverified requests are not confirmed subscribers. Verify the actual sender in the official branch WhatsApp account and the exact confirmation code. Never confirm from a screenshot alone.',
          'الطلبات غير الموثّقة ليست اشتراكات مؤكدة. تحققوا من المرسل الفعلي في حساب واتساب الرسمي للفرع ورمز التأكيد المطابق. لا تؤكدوا اعتماداً على لقطة شاشة فقط.',
        )}
      />
      {(error || list.error) && <ErrorState message={error || list.error} />}
      {list.loading ? (
        <LoadingState />
      ) : (
        <div className="admin-panel">
          {list.data?.length ? (
            list.data.map((s) => (
              <article className="video-list-row" key={s.id}>
                <div>
                  <strong dir="ltr">{s.contactMasked}</strong>
                  <p>
                    {s.state} · {s.scopes.join(', ')}
                  </p>
                  {s.state === 'PENDING' && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setBusy(true);
                        setError('');
                        const f = new FormData(e.currentTarget);
                        try {
                          await request(
                            path + 'subscriptions/' + s.id + '/confirm',
                            {
                              method: 'POST',
                              body: JSON.stringify({
                                receivedFromPhone: f.get('phone'),
                                confirmationCode: f.get('code'),
                                verifiedOfficialInbound:
                                  f.get('verified') === 'on',
                              }),
                            },
                          );
                          await list.reload();
                        } catch (e) {
                          setError(messageOf(e));
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      <Field
                        label={t(
                          'Actual incoming WhatsApp sender (+9665…)',
                          'مرسل واتساب الوارد الفعلي (+9665…)',
                        )}
                      >
                        <input
                          required
                          name="phone"
                          type="tel"
                          pattern="\+9665[0-9]{8}"
                          autoComplete="off"
                          dir="ltr"
                        />
                      </Field>
                      <Field
                        label={t(
                          'Code from incoming message',
                          'الرمز من الرسالة الواردة',
                        )}
                      >
                        <input
                          required
                          name="code"
                          pattern="[a-f0-9]{16}"
                          autoComplete="off"
                          dir="ltr"
                        />
                      </Field>
                      <label className="admin-checks">
                        <input name="verified" type="checkbox" required />
                        {t(
                          'I checked the actual sender and voluntary confirmation in the official branch account.',
                          'تحققت من المرسل الفعلي والتأكيد الطوعي في حساب الفرع الرسمي.',
                        )}
                      </label>
                      <button className="admin-button" disabled={busy}>
                        {t('Confirm verified opt-in', 'تأكيد الموافقة الموثّقة')}
                      </button>
                    </form>
                  )}
                </div>
                {s.confirmed && (
                  <button
                    className="admin-button secondary"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await request(
                          path +
                            'subscriptions/' +
                            s.subscriptionId +
                            '/suppress',
                          { method: 'POST', body: '{}' },
                        );
                        await list.reload();
                      } catch (e) {
                        setError(messageOf(e));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {t(
                      'Record withdrawal / suppress',
                      'تسجيل الانسحاب / المنع',
                    )}
                  </button>
                )}
              </article>
            ))
          ) : (
            <p>
              {t(
                'No requests recorded. No customers were added automatically.',
                'لا توجد طلبات مسجلة. لم يُضف عملاء تلقائياً.',
              )}
            </p>
          )}
        </div>
      )}
      {user?.role === 'SUPER_ADMIN' && (
        <button
          className="admin-button secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await request(path + 'retention', { method: 'POST', body: '{}' });
              await list.reload();
            } catch (e) {
              setError(messageOf(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {t('Apply configured data retention', 'تطبيق مدة الاحتفاظ المهيأة')}
        </button>
      )}
    </>
  );
}
export function MessagingWorkspace() {
  const { user } = useAdmin(),
    t = useText();
  const health = useResource<{
    outboundEnabled: boolean;
    credentialsPresent: boolean;
    webhookConfigured: boolean;
    dailyMessageLimit: number;
    dailyBudgetMinor: number;
  }>(user?.role === 'SUPER_ADMIN' ? path + 'provider' : null);
  return (
    <>
      <PageTitle
        eyebrow={t('CUSTOMER ENGAGEMENT', 'تواصل العملاء')}
        title={t('WhatsApp setup', 'إعداد واتساب')}
        description={t(
          'Customer-initiated click-to-chat works now. Outbound marketing is disabled and no delivery is simulated.',
          'يعمل فتح المحادثة بمبادرة العميل. إرسال التسويق معطّل ولا تُحاكى عمليات التسليم.',
        )}
      />
      <section className="admin-panel">
        <h2>
          {t(
            'Official WhatsApp Business app greeting',
            'ترحيب تطبيق واتساب للأعمال الرسمي',
          )}
        </h2>
        <ol>
          <li>
            {t(
              'Open WhatsApp Business settings → Business tools → Greeting message.',
              'افتحوا إعدادات واتساب للأعمال ← أدوات النشاط التجاري ← رسالة الترحيب.',
            )}
          </li>
          <li>
            {t(
              'Use a greeting identifying Gulf Pharmacy and the real branch. Invite the customer to describe their enquiry without sharing sensitive health details.',
              'عرّفوا بصيدلية الخليج والفرع الحقيقي وادعوا العميل لطرح استفساره دون تفاصيل صحية حساسة.',
            )}
          </li>
          <li>
            {t(
              'An enquiry or QR scan is not marketing consent. Verify opt-in messages separately before confirming subscriptions.',
              'الاستفسار أو مسح الرمز ليس موافقة تسويقية. تحققوا من رسائل الاشتراك منفصلة قبل تأكيده.',
            )}
          </li>
        </ol>
        <p>
          {t(
            'Free click-to-chat does not require a paid provider and never sends the customer’s message automatically.',
            'فتح المحادثة المجاني لا يتطلب مزوداً مدفوعاً ولا يرسل رسالة العميل تلقائياً.',
          )}
        </p>
      </section>
      <section className="admin-panel">
        <h2>{t('Official platform readiness', 'جاهزية المنصة الرسمية')}</h2>
        <p>
          {t(
            'Outbound marketing: DISABLED. Daily sending limit: 0. Daily budget: 0.',
            'إرسال التسويق: معطّل. الحد اليومي للرسائل: 0. الميزانية اليومية: 0.',
          )}
        </p>
        {health.data && (
          <p>
            {t('Credentials configured', 'بيانات الاعتماد مهيأة')}:{' '}
            {String(health.data.credentialsPresent)} ·{' '}
            {t('Webhook configured', 'الويب هوك مهيأ')}:{' '}
            {String(health.data.webhookConfigured)}
          </p>
        )}
        {health.error && <ErrorState message={health.error} />}
        <p>
          {t(
            'Future sending requires an official provider, eligible recipients, approved templates, current healthcare/promotion policy clearance, regulatory authorization, budgets and explicit Super Admin approval.',
            'الإرسال المستقبلي يتطلب مزوداً رسمياً ومستلمين مؤهلين وقوالب معتمدة واستيفاء سياسات الرعاية الصحية والترويج والتصاريح والميزانيات وموافقة المدير العام الصريحة.',
          )}
        </p>
        <a
          href="https://whatsappbusiness.com/policy/"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t(
            'Current WhatsApp Business policy',
            'سياسة واتساب للأعمال الحالية',
          )}{' '}
          ↗
        </a>
      </section>
    </>
  );
}
