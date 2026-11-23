'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type {
  ManagedVideo,
  VideoCategory,
  Branch,
  StaffAccount,
  VideoStatus,
} from '@gulf/shared';
import { VIDEO_STATUSES } from '@gulf/shared';
import { useAdmin, useText } from '@/features/admin/provider';
import { useResource } from '@/features/admin/use-resource';
import {
  ErrorState,
  LoadingState,
  Field,
  PageTitle,
  messageOf,
} from '@/features/admin/ui';
const statusAr: Record<VideoStatus, string> = {
  DRAFT: 'مسودة',
  UPLOADING: 'جارٍ الرفع',
  PROCESSING: 'جارٍ المعالجة',
  PROCESSING_FAILED: 'فشلت المعالجة',
  PENDING_REVIEW: 'بانتظار المراجعة',
  CHANGES_REQUESTED: 'تعديلات مطلوبة',
  APPROVED: 'معتمد',
  PUBLISHED: 'منشور',
  REJECTED: 'مرفوض',
  ARCHIVED: 'مؤرشف',
};
export function VideoWorkspace({ review = false }: { review?: boolean }) {
  const { user, locale } = useAdmin(),
    t = useText();
  const [page, setPage] = useState(1);
  const resource = useResource<{
    items: Pick<
      ManagedVideo,
      'id' | 'titleEn' | 'titleAr' | 'status' | 'revision'
    >[];
    counts: { status: VideoStatus; count: number }[];
    total: number;
  }>('/admin/videos?page=' + page + (review ? '&review=true' : ''));
  const analytics = useResource<
    {
      categoryTitle: string;
      eventType: string;
      count: number;
      branchId: string;
    }[]
  >(
    user && ['SUPER_ADMIN', 'BRANCH_ADMIN'].includes(user.role)
      ? '/admin/videos/analytics'
      : null,
  );
  if (resource.loading) return <LoadingState />;
  if (resource.error)
    return (
      <ErrorState
        message={resource.error}
        retry={() => void resource.reload()}
      />
    );
  return (
    <>
      <PageTitle
        eyebrow={t('GULF HEALTH ACADEMY', 'أكاديمية الخليج الصحية')}
        title={
          review
            ? t('Review queue', 'قائمة المراجعة')
            : t('Video workspace', 'مساحة الفيديوهات')
        }
        description={t(
          'Create, review and publish with care. Every approval belongs to a specific revision.',
          'أنشئ وراجع وانشر بعناية. كل اعتماد مرتبط بنسخة محددة.',
        )}
      />
      <div className="admin-actions">
        <Link className="admin-button secondary" href="/admin/videos">
          {t('All videos', 'جميع الفيديوهات')}
        </Link>
        <Link className="admin-button secondary" href="/admin/videos/review">
          {t('Pending review', 'بانتظار المراجعة')}
        </Link>
        {user?.role === 'PHARMACIST' && (
          <Link className="admin-button" href="/admin/videos/new">
            {t('Create video', 'إنشاء فيديو')}
          </Link>
        )}
        {user?.role === 'SUPER_ADMIN' && (
          <Link
            className="admin-button secondary"
            href="/admin/videos/categories"
          >
            {t('Categories', 'التصنيفات')}
          </Link>
        )}
      </div>
      <div className="video-counts">
        {VIDEO_STATUSES.map((status) => (
          <div className="admin-panel" key={status}>
            <strong>
              {resource.data?.counts.find((r) => r.status === status)?.count ??
                0}
            </strong>
            <span>
              {locale === 'ar' ? statusAr[status] : status.replaceAll('_', ' ')}
            </span>
          </div>
        ))}
      </div>
      <div className="admin-panel">
        {!resource.data?.items.length ? (
          <p>
            {t(
              'No videos in this workspace yet.',
              'لا توجد فيديوهات في مساحة العمل بعد.',
            )}
          </p>
        ) : (
          resource.data.items.map((v) => (
            <article className="video-list-row" key={v.id}>
              <Link href={'/admin/videos/' + v.id}>
                <strong>{locale === 'ar' ? v.titleAr : v.titleEn}</strong>
              </Link>
              <span>
                {locale === 'ar' ? statusAr[v.status] : v.status} ·{' '}
                {t('Revision', 'النسخة')} {v.revision}
              </span>
            </article>
          ))
        )}
      </div>
      <div className="admin-actions">
        <button
          className="admin-button secondary"
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          {t('Previous', 'السابق')}
        </button>
        <span>{page}</span>
        <button
          className="admin-button secondary"
          disabled={(resource.data?.items.length ?? 0) < 20}
          onClick={() => setPage(page + 1)}
        >
          {t('Next', 'التالي')}
        </button>
      </div>
      {['SUPER_ADMIN', 'BRANCH_ADMIN'].includes(user?.role ?? '') && (
        <section className="admin-panel">
          <h2>
            {t('Aggregate engagement signals', 'إشارات التفاعل الإجمالية')}
          </h2>
          <p>
            {t(
              'Recorded plays, completions and contact clicks. These are rate-limited signals, not verified unique people.',
              'مرات التشغيل والإكمال ونقرات التواصل المسجلة. هذه إشارات محدودة المعدل وليست عدداً موثّقاً للأشخاص.',
            )}
          </p>
          {analytics.error ? (
            <ErrorState message={analytics.error} />
          ) : analytics.data?.length ? (
            <ul>
              {analytics.data.map((r, i) => (
                <li key={i}>
                  {r.categoryTitle} · {r.eventType}: {r.count}
                </li>
              ))}
            </ul>
          ) : (
            <p>
              {t(
                'No engagement events recorded yet.',
                'لم تُسجل أحداث تفاعل بعد.',
              )}
            </p>
          )}
        </section>
      )}
    </>
  );
}
export function VideoEditor({ videoId }: { videoId?: string }) {
  const { user, request } = useAdmin(),
    t = useText(),
    router = useRouter();
  const video = useResource<ManagedVideo>(
    videoId ? '/admin/videos/' + videoId : null,
  );
  const categories = useResource<VideoCategory[]>('/admin/videos/categories');
  const branches = useResource<Branch[]>('/admin/academy/branches');
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  if (video.loading || categories.loading || branches.loading)
    return <LoadingState />;
  if (video.error || categories.error || branches.error)
    return (
      <ErrorState message={video.error || categories.error || branches.error} />
    );
  if (!videoId && user?.role !== 'PHARMACIST')
    return (
      <ErrorState
        message={t(
          'Only pharmacists can create video drafts.',
          'إنشاء المسودات متاح للصيادلة فقط.',
        )}
      />
    );
  const v = video.data;
  return (
    <>
      <PageTitle
        eyebrow={t('GULF HEALTH ACADEMY', 'أكاديمية الخليج الصحية')}
        title={
          videoId
            ? t('Edit video metadata', 'تعديل بيانات الفيديو')
            : t('Create video draft', 'إنشاء مسودة فيديو')
        }
        description={t(
          'Content changes clear previous approvals and remove the video from public access. Upload media after saving this draft.',
          'تُلغي تغييرات المحتوى الاعتمادات السابقة وتوقف ظهوره للعامة. ارفع الفيديو بعد حفظ المسودة.',
        )}
      />
      {error && <ErrorState message={error} />}
      <form
        className="admin-panel"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          const f = new FormData(e.currentTarget);
          try {
            const refs = String(f.get('references') ?? '')
              .split('\n')
              .filter((s) => s.trim())
              .map((s) => {
                const [sourceTitle, ...url] = s.split('|');
                return {
                  sourceTitle: sourceTitle.trim(),
                  sourceUrl: url.join('|').trim(),
                };
              });
            const body = Object.fromEntries(
              [
                'slug',
                'titleEn',
                'titleAr',
                'descriptionEn',
                'descriptionAr',
                'categoryId',
                'branchId',
                'visibilityScope',
                'contentKind',
              ].map((k) => [k, f.get(k)]),
            );
            const result = await request<{ id: string }>(
              '/admin/videos' + (videoId ? '/' + videoId : ''),
              {
                method: videoId ? 'PATCH' : 'POST',
                body: JSON.stringify({ ...body, references: refs }),
              },
            );
            router.push('/admin/videos/' + result.id);
          } catch (e) {
            setError(messageOf(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="admin-form-grid">
          {(['titleEn', 'titleAr', 'slug'] as const).map((k) => (
            <Field
              key={k}
              label={
                k === 'titleEn'
                  ? t('English title', 'العنوان بالإنجليزية')
                  : k === 'titleAr'
                    ? t('Arabic title', 'العنوان بالعربية')
                    : t('URL slug', 'معرّف الرابط')
              }
            >
              <input
                name={k}
                required
                maxLength={k === 'slug' ? 120 : 200}
                defaultValue={v?.[k] ?? ''}
                dir={k === 'titleAr' ? 'rtl' : 'ltr'}
                pattern={k === 'slug' ? '[a-z0-9]+(?:-[a-z0-9]+)*' : undefined}
              />
            </Field>
          ))}
          <Field label={t('Category', 'التصنيف')}>
            <select
              name="categoryId"
              required
              defaultValue={v?.categoryId ?? ''}
            >
              <option value="">{t('Select category', 'اختر التصنيف')}</option>
              {categories.data
                ?.filter((c) => c.isActive)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {t(c.titleEn, c.titleAr)}
                  </option>
                ))}
            </select>
          </Field>
          <Field label={t('Source branch', 'الفرع المصدر')}>
            <select name="branchId" defaultValue={v?.branchId ?? ''} required>
              {!v && (
                <option value="">{t('Select branch', 'اختر الفرع')}</option>
              )}
              {branches.data
                ?.filter((b) => !v || b.id === v.branchId)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {t(b.nameEn, b.nameAr)}
                  </option>
                ))}
            </select>
          </Field>
          <Field label={t('Visibility scope', 'نطاق الظهور')}>
            <select
              name="visibilityScope"
              defaultValue={v?.visibilityScope ?? 'BRANCH'}
            >
              <option value="BRANCH">
                {t('Source branch', 'الفرع المصدر')}
              </option>
              <option value="ALL_BRANCHES">
                {t('All published branches', 'جميع الفروع المنشورة')}
              </option>
            </select>
          </Field>
          <Field label={t('Content classification', 'تصنيف المحتوى')}>
            <select
              name="contentKind"
              defaultValue={v?.contentKind ?? 'GENERAL_EDUCATION'}
            >
              <option value="GENERAL_EDUCATION">
                {t('General education', 'تثقيف عام')}
              </option>
              <option value="REGULATED_PROMOTION">
                {t(
                  'Regulated promotion (authorization required)',
                  'ترويج منظم (يتطلب تصريحاً)',
                )}
              </option>
            </select>
          </Field>
        </div>
        <Field label={t('English description', 'الوصف بالإنجليزية')}>
          <textarea
            name="descriptionEn"
            rows={5}
            maxLength={10000}
            defaultValue={v?.descriptionEn ?? ''}
          />
        </Field>
        <Field label={t('Arabic description', 'الوصف بالعربية')}>
          <textarea
            name="descriptionAr"
            dir="rtl"
            rows={5}
            maxLength={10000}
            defaultValue={v?.descriptionAr ?? ''}
          />
        </Field>
        <Field
          label={t(
            'References — one per line: source title | https://source-url',
            'المراجع — كل مرجع في سطر: عنوان المصدر | https://source-url',
          )}
        >
          <textarea
            name="references"
            rows={5}
            dir="ltr"
            defaultValue={
              v?.references
                .map((r) => r.sourceTitle + ' | ' + r.sourceUrl)
                .join('\n') ?? ''
            }
          />
        </Field>
        <button className="admin-button" disabled={busy}>
          {busy ? t('Saving…', 'جارٍ الحفظ…') : t('Save draft', 'حفظ المسودة')}
        </button>
      </form>
    </>
  );
}
const privateAsset = (id: string, type: string) =>
  new URL(
    '/api/admin/videos/' + id + '/assets/' + type,
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  ).toString();
export function VideoDetailWorkspace({ videoId }: { videoId: string }) {
  const { user, request, locale } = useAdmin(),
    t = useText();
  const resource = useResource<ManagedVideo>('/admin/videos/' + videoId);
  const staff = useResource<StaffAccount[]>(
    user?.role === 'SUPER_ADMIN' ? '/admin/users' : null,
  );
  const [error, setError] = useState(''),
    [success, setSuccess] = useState(''),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState<number | null>(null);
  useEffect(() => {
    if (
      !resource.data ||
      !['UPLOADING', 'PROCESSING'].includes(resource.data.status)
    )
      return;
    const timer = setInterval(() => void resource.reload(), 3000);
    return () => clearInterval(timer);
  }, [resource.data, resource.reload]);
  async function action(path: string, body: unknown = {}) {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await request('/admin/videos/' + videoId + '/' + path, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setSuccess(t('Saved.', 'تم الحفظ.'));
      await resource.reload();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  if (resource.loading && !resource.data) return <LoadingState />;
  if (resource.error)
    return (
      <ErrorState
        message={resource.error}
        retry={() => void resource.reload()}
      />
    );
  const v = resource.data;
  if (!v) return null;
  const isAuthor = user?.role === 'PHARMACIST' && user.id === v.authorId;
  const canEdit =
    [
      'DRAFT',
      'CHANGES_REQUESTED',
      'REJECTED',
      'APPROVED',
      'PUBLISHED',
      'PROCESSING_FAILED',
    ].includes(v.status) && user?.role !== 'MEDICAL_REVIEWER';
  return (
    <>
      <PageTitle
        eyebrow={t('GULF HEALTH ACADEMY', 'أكاديمية الخليج الصحية')}
        title={t(v.titleEn, v.titleAr)}
        description={
          (locale === 'ar' ? statusAr[v.status] : v.status) +
          ' · ' +
          t('Revision', 'النسخة') +
          ' ' +
          v.revision
        }
      />
      {error && <ErrorState message={error} />}
      {success && (
        <p role="status" className="admin-success">
          {success}
        </p>
      )}
      <div className="admin-actions">
        <Link className="admin-button secondary" href="/admin/videos">
          {t('All videos', 'جميع الفيديوهات')}
        </Link>
        {canEdit && (
          <Link
            className="admin-button secondary"
            href={'/admin/videos/' + v.id + '/edit'}
          >
            {t('Edit metadata', 'تعديل البيانات')}
          </Link>
        )}
        {['DRAFT', 'CHANGES_REQUESTED', 'REJECTED'].includes(v.status) &&
          user?.role !== 'MEDICAL_REVIEWER' && (
            <button
              className="admin-button"
              disabled={busy}
              onClick={() => void action('submit')}
            >
              {t('Submit for review', 'إرسال للمراجعة')}
            </button>
          )}
        {v.status === 'PROCESSING_FAILED' &&
          ['PHARMACIST', 'SUPER_ADMIN'].includes(user?.role ?? '') && (
            <button
              className="admin-button"
              disabled={busy}
              onClick={() => void action('retry')}
            >
              {t('Retry processing', 'إعادة المعالجة')}
            </button>
          )}
        {user?.role === 'SUPER_ADMIN' && (
          <>
            <button
              className="admin-button"
              disabled={busy || v.status !== 'APPROVED'}
              onClick={() => void action('publish')}
            >
              {t('Publish', 'نشر')}
            </button>
            <button
              className="admin-button secondary"
              disabled={
                busy ||
                ['UPLOADING', 'PROCESSING', 'ARCHIVED'].includes(v.status)
              }
              onClick={() => void action('archive')}
            >
              {t('Archive / unpublish', 'أرشفة / إلغاء النشر')}
            </button>
          </>
        )}
      </div>
      <section className="admin-panel">
        <h2>{t('Media and processing', 'الوسائط والمعالجة')}</h2>
        <p>
          {t('Medical review', 'المراجعة الطبية')}: {v.medicalReviewStatus} ·{' '}
          {t('Compliance', 'الامتثال')}: {v.complianceStatus}
        </p>
        {v.processingError && (
          <p role="alert">
            {t('Processing error', 'خطأ المعالجة')}: {v.processingError}
          </p>
        )}
        {v.assets.some((a) => a.assetType === 'PLAYBACK') && (
          <video
            className="video-private-preview"
            controls
            crossOrigin="use-credentials"
            preload="metadata"
            poster={privateAsset(v.id, 'thumbnail')}
          >
            <source src={privateAsset(v.id, 'playback')} type="video/mp4" />
            {v.assets
              .filter((a) => a.assetType.startsWith('CAPTIONS'))
              .map((a) => (
                <track
                  key={a.id}
                  kind="captions"
                  srcLang={a.assetType === 'CAPTIONS_EN' ? 'en' : 'ar'}
                  src={privateAsset(
                    v.id,
                    a.assetType === 'CAPTIONS_EN'
                      ? 'captions-en'
                      : 'captions-ar',
                  )}
                />
              ))}
          </video>
        )}
        {isAuthor && canEdit && (
          <>
            <Field label={t('Upload MP4 or MOV video', 'رفع فيديو MP4 أو MOV')}>
              <input
                type="file"
                accept="video/mp4,video/quicktime,.mp4,.mov"
                disabled={busy}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setBusy(true);
                  setError('');
                  setProgress(0);
                  try {
                    await new Promise<void>((resolve, reject) => {
                      const xhr = new XMLHttpRequest();
                      xhr.open(
                        'PUT',
                        privateAsset(v.id, 'playback').replace(
                          '/assets/playback',
                          '/upload',
                        ),
                      );
                      xhr.withCredentials = true;
                      xhr.timeout = 180000;
                      xhr.setRequestHeader(
                        'Content-Type',
                        file.type === 'video/quicktime' ||
                          file.name.toLowerCase().endsWith('.mov')
                          ? 'video/quicktime'
                          : 'video/mp4',
                      );
                      xhr.setRequestHeader('X-Gulf-Request', 'admin');
                      xhr.upload.onprogress = (e) => {
                        if (e.lengthComputable)
                          setProgress(Math.round((e.loaded / e.total) * 100));
                      };
                      xhr.onload = () => {
                        if (xhr.status >= 200 && xhr.status < 300) resolve();
                        else {
                          try {
                            reject(
                              new Error(JSON.parse(xhr.responseText).message),
                            );
                          } catch {
                            reject(new Error('Upload failed'));
                          }
                        }
                      };
                      xhr.onerror = () =>
                        reject(
                          new Error(
                            t('Upload connection failed.', 'تعذّر اتصال الرفع.'),
                          ),
                        );
                      xhr.ontimeout = () =>
                        reject(
                          new Error(
                            t('Upload timed out.', 'انتهت مهلة الرفع.'),
                          ),
                        );
                      xhr.send(file);
                    });
                    setSuccess(
                      t(
                        'Upload accepted. Background processing has started.',
                        'تم قبول الرفع وبدأت المعالجة في الخلفية.',
                      ),
                    );
                    await resource.reload();
                  } catch (e) {
                    setError(messageOf(e));
                    await resource.reload();
                  } finally {
                    setBusy(false);
                    setProgress(null);
                  }
                }}
              />
            </Field>
            {progress !== null && (
              <div role="status">
                <progress value={progress} max={100} />
                <span>
                  {' '}
                  {progress}%{' '}
                  {progress === 100
                    ? t('— validating upload…', '— جارٍ التحقق…')
                    : ''}
                </span>
              </div>
            )}
            <p>
              {t(
                'Originals remain private. Replacing media clears all approvals.',
                'تبقى النسخ الأصلية خاصة. استبدال الفيديو يلغي جميع الاعتمادات.',
              )}
            </p>
            {(['en', 'ar'] as const).map((l) => (
              <Field
                key={l}
                label={
                  l === 'en'
                    ? t('English captions (.vtt)', 'ترجمة إنجليزية (.vtt)')
                    : t('Arabic captions (.vtt)', 'ترجمة عربية (.vtt)')
                }
              >
                <input
                  type="file"
                  accept=".vtt,text/vtt"
                  disabled={busy || !v.durationSeconds}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 1024 * 1024) {
                      setError(
                        t(
                          'Captions must be under 1 MB.',
                          'يجب ألا تتجاوز الترجمة 1 ميغابايت.',
                        ),
                      );
                      return;
                    }
                    setBusy(true);
                    setError('');
                    try {
                      await request('/admin/videos/' + v.id + '/captions', {
                        method: 'PUT',
                        body: JSON.stringify({
                          locale: l,
                          text: await file.text(),
                        }),
                      });
                      await resource.reload();
                    } catch (e) {
                      setError(messageOf(e));
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              </Field>
            ))}
          </>
        )}
      </section>
      <section className="admin-panel">
        <h2>
          {t(
            'Descriptions and supporting references',
            'الأوصاف والمراجع الداعمة',
          )}
        </h2>
        <p className="video-multiline">{v.descriptionEn}</p>
        <p dir="rtl" className="video-multiline">
          {v.descriptionAr}
        </p>
        <ul>
          {v.references.map((r, i) => (
            <li key={i}>
              <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer">
                {r.sourceTitle}
              </a>
            </li>
          ))}
        </ul>
      </section>
      {user?.role === 'SUPER_ADMIN' && (
        <section className="admin-panel">
          <h2>{t('Assign medical reviewer', 'تعيين مراجع طبي')}</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void action('reviewers', {
                reviewerId: new FormData(e.currentTarget).get('reviewerId'),
              });
            }}
          >
            <Field
              label={t(
                'Independent reviewer with branch membership',
                'مراجع مستقل لديه صلاحية الفرع',
              )}
            >
              <select name="reviewerId" required>
                <option value="">{t('Select reviewer', 'اختر المراجع')}</option>
                {staff.data
                  ?.filter(
                    (s) =>
                      s.isActive &&
                      s.role === 'MEDICAL_REVIEWER' &&
                      s.branchIds.includes(v.branchId),
                  )
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.displayName}
                      {v.reviewerIds.includes(s.id) ? ' ✓' : ''}
                    </option>
                  ))}
              </select>
            </Field>
            <button className="admin-button" disabled={busy}>
              {t('Assign reviewer', 'تعيين المراجع')}
            </button>
          </form>
        </section>
      )}
      {((user?.role === 'MEDICAL_REVIEWER' && v.status === 'PENDING_REVIEW') ||
        (user?.role === 'SUPER_ADMIN' &&
          ['PENDING_REVIEW', 'APPROVED', 'PUBLISHED'].includes(v.status))) && (
        <section className="admin-panel">
          <h2>
            {user?.role === 'MEDICAL_REVIEWER'
              ? t('Medical review decision', 'قرار المراجعة الطبية')
              : t('Independent compliance decision', 'قرار الامتثال المستقل')}
          </h2>
          <p>
            {t(
              'Internal medical review does not replace regulatory authorization. Review the actual content and references.',
              'المراجعة الطبية الداخلية لا تحل محل التصريح التنظيمي. راجع المحتوى الفعلي والمراجع.',
            )}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const body: Record<string, unknown> = {
                decision: f.get('decision'),
                comments: f.get('comments'),
              };
              if (user?.role === 'SUPER_ADMIN') {
                if (f.get('approvalReference'))
                  body.approvalReference = f.get('approvalReference');
                if (f.get('validUntil'))
                  body.validUntil = new Date(
                    String(f.get('validUntil')),
                  ).toISOString();
                body.authorAttributionApproved =
                  f.get('authorAttributionApproved') === 'on';
              }
              void action(
                user?.role === 'MEDICAL_REVIEWER'
                  ? 'medical-review'
                  : 'compliance-review',
                body,
              );
            }}
          >
            <Field label={t('Decision', 'القرار')}>
              <select name="decision">
                <option value="APPROVE">{t('Approve', 'اعتماد')}</option>
                <option value="CHANGES_REQUESTED">
                  {t('Request changes', 'طلب تعديلات')}
                </option>
                <option value="REJECT">{t('Reject', 'رفض')}</option>
                {user?.role === 'SUPER_ADMIN' &&
                  v.contentKind === 'GENERAL_EDUCATION' && (
                    <option value="NOT_REQUIRED">
                      {t(
                        'No regulated authorization required',
                        'لا يلزم تصريح تنظيمي',
                      )}
                    </option>
                  )}
              </select>
            </Field>
            <Field
              label={t('Review notes (required)', 'ملاحظات المراجعة (مطلوبة)')}
            >
              <textarea name="comments" required maxLength={5000} rows={4} />
            </Field>
            {user?.role === 'SUPER_ADMIN' && (
              <>
                <Field label={t('Authorization reference', 'مرجع التصريح')}>
                  <input
                    name="approvalReference"
                    maxLength={300}
                    required={v.contentKind === 'REGULATED_PROMOTION'}
                  />
                </Field>
                <Field
                  label={t(
                    'Valid until (local time)',
                    'صالح حتى (التوقيت المحلي)',
                  )}
                >
                  <input
                    type="datetime-local"
                    name="validUntil"
                    required={v.contentKind === 'REGULATED_PROMOTION'}
                  />
                </Field>
                <label className="admin-checks">
                  <input name="authorAttributionApproved" type="checkbox" />
                  {t(
                    'Author identity verified and authorized for public attribution',
                    'تم التحقق من هوية المؤلف والتصريح بذكر اسمه للعامة',
                  )}
                </label>
              </>
            )}
            <button className="admin-button" disabled={busy}>
              {t('Record decision', 'تسجيل القرار')}
            </button>
          </form>
        </section>
      )}
      <section className="admin-panel">
        <h2>{t('Review history', 'سجل المراجعات')}</h2>
        {!v.reviews.length ? (
          <p>
            {t('No review decisions recorded.', 'لا توجد قرارات مراجعة مسجلة.')}
          </p>
        ) : (
          v.reviews.map((r) => (
            <article className="video-list-row" key={r.id}>
              <div>
                <strong>
                  {r.kind} · {r.decision} · {t('Revision', 'النسخة')}{' '}
                  {r.revision}
                </strong>
                <p className="video-multiline">{r.comments}</p>
                <time>{new Date(r.reviewedAt).toLocaleString(locale)}</time>
              </div>
            </article>
          ))
        )}
      </section>
    </>
  );
}
export function CategoryWorkspace() {
  const { user, request } = useAdmin(),
    t = useText();
  const resource = useResource<VideoCategory[]>('/admin/videos/categories');
  const [editing, setEditing] = useState<VideoCategory | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  if (user?.role !== 'SUPER_ADMIN')
    return (
      <ErrorState
        message={t('Super Admin access required.', 'يلزم وصول المدير العام.')}
      />
    );
  if (resource.loading) return <LoadingState />;
  return (
    <>
      <PageTitle
        eyebrow={t('GULF HEALTH ACADEMY', 'أكاديمية الخليج الصحية')}
        title={t('Video categories', 'تصنيفات الفيديو')}
        description={t(
          'Disabling a category immediately hides its public videos and media.',
          'تعطيل التصنيف يخفي فيديوهاته ووسائطه العامة فوراً.',
        )}
      />
      {(error || resource.error) && (
        <ErrorState message={error || resource.error} />
      )}
      <form
        key={editing?.id ?? 'new'}
        className="admin-panel"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const f = new FormData(form);
          setBusy(true);
          setError('');
          try {
            await request(
              '/admin/videos/categories' + (editing ? '/' + editing.id : ''),
              {
                method: editing ? 'PUT' : 'POST',
                body: JSON.stringify({
                  slug: f.get('slug'),
                  titleEn: f.get('titleEn'),
                  titleAr: f.get('titleAr'),
                  descriptionEn: f.get('descriptionEn'),
                  descriptionAr: f.get('descriptionAr'),
                  sortOrder: Number(f.get('sortOrder')),
                  isActive: f.get('isActive') === 'on',
                }),
              },
            );
            setEditing(null);
            form.reset();
            await resource.reload();
          } catch (e) {
            setError(messageOf(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>
          {editing
            ? t('Edit category', 'تعديل التصنيف')
            : t('Create category', 'إنشاء تصنيف')}
        </h2>
        <div className="admin-form-grid">
          {(
            [
              'slug',
              'titleEn',
              'titleAr',
              'descriptionEn',
              'descriptionAr',
            ] as const
          ).map((k) => (
            <Field
              key={k}
              label={
                k === 'slug'
                  ? t('URL slug', 'معرّف الرابط')
                  : k === 'titleEn'
                    ? t('English title', 'العنوان بالإنجليزية')
                    : k === 'titleAr'
                      ? t('Arabic title', 'العنوان بالعربية')
                      : k === 'descriptionEn'
                        ? t('English description', 'الوصف بالإنجليزية')
                        : t('Arabic description', 'الوصف بالعربية')
              }
            >
              <input
                name={k}
                dir={k.endsWith('Ar') ? 'rtl' : 'ltr'}
                required={k.startsWith('title') || k === 'slug'}
                defaultValue={editing?.[k] ?? ''}
                maxLength={
                  k.startsWith('description') ? 2000 : k === 'slug' ? 120 : 160
                }
              />
            </Field>
          ))}
          <Field label={t('Sort order', 'الترتيب')}>
            <input
              name="sortOrder"
              type="number"
              min={0}
              max={10000}
              defaultValue={editing?.sortOrder ?? 0}
            />
          </Field>
        </div>
        <label className="admin-checks">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={editing?.isActive ?? true}
          />
          {t('Enabled', 'مفعّل')}
        </label>
        <div className="admin-actions">
          <button className="admin-button" disabled={busy}>
            {t('Save category', 'حفظ التصنيف')}
          </button>
          {editing && (
            <button
              type="button"
              className="admin-button secondary"
              onClick={() => setEditing(null)}
            >
              {t('Cancel', 'إلغاء')}
            </button>
          )}
        </div>
      </form>
      <div className="admin-panel">
        {resource.data?.map((c) => (
          <article className="video-list-row" key={c.id}>
            <div>
              <strong>{t(c.titleEn, c.titleAr)}</strong>
              <p>
                {c.sortOrder} ·{' '}
                {c.isActive ? t('Enabled', 'مفعّل') : t('Disabled', 'معطّل')}
              </p>
            </div>
            <button
              className="admin-button secondary"
              onClick={() => setEditing(c)}
            >
              {t('Edit', 'تعديل')}
            </button>
          </article>
        ))}
      </div>
    </>
  );
}
