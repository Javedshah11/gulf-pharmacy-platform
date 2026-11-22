'use client';
import Link from 'next/link';
import { useState } from 'react';
import type { Branch } from '@gulf/shared';
import { useAdmin, useText } from './provider';
import { useResource } from './use-resource';
import {
  ConfirmDialog,
  ErrorState,
  Field,
  LoadingState,
  PageTitle,
  messageOf,
} from './ui';
export function BranchList({ overview = false }: { overview?: boolean }) {
  const { data, error, loading, reload } =
    useResource<Branch[]>('/admin/branches');
  const { user, locale } = useAdmin();
  const t = useText();
  if (loading) return <LoadingState />;
  return (
    <>
      <PageTitle
        eyebrow={t('YOUR WORKSPACE', 'مساحة العمل')}
        title={
          overview
            ? t('A clear view of your pharmacy.', 'نظرة واضحة على صيدليتكم.')
            : t('Branches', 'الفروع')
        }
        description={
          user?.role === 'SUPER_ADMIN'
            ? t(
                'Manage business profiles and branch access across Gulf Pharmacy.',
                'إدارة بيانات الفروع وصلاحيات الوصول في صيدلية الخليج.',
              )
            : t(
                'Business profiles for the branches assigned to you.',
                'بيانات الفروع المخصصة لكم.',
              )
        }
      />
      {error ? (
        <ErrorState message={error} retry={() => void reload()} />
      ) : (
        <>
          {overview && (
            <div className="admin-summary">
              <span>{t('Accessible branches', 'الفروع المتاحة')}</span>
              <strong>{data?.length ?? 0}</strong>
              <p>
                {t(
                  'Based on your current access permissions.',
                  'حسب صلاحيات الوصول الحالية.',
                )}
              </p>
            </div>
          )}
          <div className="admin-section-heading">
            <h2>{t('Your branches', 'فروعكم')}</h2>
            <span>{t('Business profiles', 'البيانات التجارية')}</span>
          </div>
          <div className="admin-branch-grid">
            {data?.length ? (
              data.map((branch) => (
                <Link
                  className="admin-branch-tile"
                  href={'/admin/branches/' + branch.id}
                  key={branch.id}
                >
                  <span className="admin-tag">
                    {branch.isActive
                      ? t('Active', 'نشط')
                      : t('Inactive', 'غير نشط')}
                  </span>
                  <h3>{locale === 'ar' ? branch.nameAr : branch.nameEn}</h3>
                  <p>{locale === 'ar' ? branch.addressAr : branch.addressEn}</p>
                  <span className="admin-tile-link">
                    {t('Manage branch profile', 'إدارة بيانات الفرع')}
                  </span>
                </Link>
              ))
            ) : (
              <div className="admin-panel">
                <h3>
                  {t('No branches assigned yet', 'لم يتم تخصيص فروع بعد')}
                </h3>
                <p>
                  {t(
                    'Ask your Super Admin to assign branch access.',
                    'اطلبوا من المسؤول العام تخصيص صلاحية الوصول للفروع.',
                  )}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
const fields = [
  { key: 'nameEn', en: 'Branch name · English', ar: 'اسم الفرع · الإنجليزية' },
  { key: 'nameAr', en: 'Branch name · Arabic', ar: 'اسم الفرع · العربية' },
  { key: 'addressEn', en: 'Address · English', ar: 'العنوان · الإنجليزية' },
  { key: 'addressAr', en: 'Address · Arabic', ar: 'العنوان · العربية' },
  { key: 'city', en: 'City', ar: 'المدينة' },
  { key: 'district', en: 'District', ar: 'الحي' },
  { key: 'phone', en: 'Phone', ar: 'الهاتف' },
  { key: 'whatsappUrl', en: 'WhatsApp URL', ar: 'رابط واتساب' },
  { key: 'mapsUrl', en: 'Google Maps URL', ar: 'رابط خرائط جوجل' },
] as const;
export function BranchEditor({ id }: { id: string }) {
  const { data, error, loading, reload } = useResource<Branch>(
    '/admin/branches/' + encodeURIComponent(id),
  );
  const { request, locale } = useAdmin();
  const t = useText();
  const [pending, setPending] = useState<Record<string, string> | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);
  if (loading) return <LoadingState />;
  if (error || !data)
    return (
      <ErrorState
        message={error || t('Branch unavailable', 'الفرع غير متاح')}
        retry={() => void reload()}
      />
    );
  return (
    <>
      <Link className="admin-back" href="/admin/branches">
        {t('All branches', 'جميع الفروع')}
      </Link>
      <PageTitle
        eyebrow={t('BRANCH PROFILE', 'بيانات الفرع')}
        title={locale === 'ar' ? data.nameAr : data.nameEn}
        description={t(
          'Keep the public business details accurate. Changes appear on the public website.',
          'حافظوا على دقة البيانات التجارية. تظهر التغييرات على الموقع العام.',
        )}
      />
      <div className="admin-panel">
        {saveError && <ErrorState message={saveError} />}{' '}
        {saved && (
          <p className="admin-success" role="status">
            {t('Branch profile saved.', 'تم حفظ بيانات الفرع.')}
          </p>
        )}
        <form
          key={JSON.stringify(data)}
          onSubmit={(event) => {
            event.preventDefault();
            setSaved(false);
            const form = new FormData(event.currentTarget);
            const updates: Record<string, string> = {};
            for (const field of fields) {
              const value = String(form.get(field.key)).trim();
              if (value !== data[field.key]) updates[field.key] = value;
            }
            if (!Object.keys(updates).length) {
              setSaved(true);
              return;
            }
            setPending(updates);
          }}
        >
          <div className="admin-form-grid">
            {fields.map((field) => (
              <Field key={field.key} label={t(field.en, field.ar)}>
                <input
                  name={field.key}
                  defaultValue={data[field.key]}
                  required
                  dir={field.key.endsWith('Ar') ? 'rtl' : 'ltr'}
                  maxLength={
                    field.key === 'mapsUrl'
                      ? 1000
                      : field.key.includes('address')
                        ? 500
                        : field.key.includes('Url')
                          ? 300
                          : field.key === 'phone'
                            ? 30
                            : field.key === 'city' || field.key === 'district'
                              ? 100
                              : 160
                  }
                  type={field.key.includes('Url') ? 'url' : 'text'}
                />
              </Field>
            ))}
          </div>
          <div className="admin-form-footer">
            <p>
              {t(
                'Branch identity and permissions are managed centrally.',
                'تتم إدارة هوية الفرع والصلاحيات مركزيًا.',
              )}
            </p>
            <button className="admin-button" disabled={busy}>
              {t('Save changes', 'حفظ التغييرات')}
            </button>
          </div>
        </form>
      </div>
      {pending && (
        <ConfirmDialog
          title={t('Update this branch?', 'تحديث بيانات الفرع؟')}
          description={t(
            'The updated business profile will be visible on the public website.',
            'ستظهر البيانات المحدثة على الموقع العام.',
          )}
          busy={busy}
          onCancel={() => setPending(null)}
          onConfirm={async () => {
            setBusy(true);
            setSaveError('');
            try {
              await request('/admin/branches/' + id, {
                method: 'PATCH',
                body: JSON.stringify(pending),
              });
              setPending(null);
              setSaved(true);
              await reload();
            } catch (e) {
              setSaveError(messageOf(e));
              setPending(null);
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </>
  );
}
