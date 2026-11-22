'use client';
import { useState } from 'react';
import { useAdmin, useText } from './provider';
import { ErrorState, Field, PageTitle, messageOf } from './ui';
export function SettingsPage() {
  const { user, request, refresh } = useAdmin();
  const t = useText();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <PageTitle
        eyebrow={t('YOUR ACCOUNT', 'حسابكم')}
        title={t('My settings', 'إعداداتي')}
        description={t(
          'Review your profile and keep your staff account secure.',
          'مراجعة بياناتكم والحفاظ على أمان حساب الموظف.',
        )}
      />
      <section className="admin-panel">
        <h2>{t('Profile', 'الملف الشخصي')}</h2>
        <dl className="admin-profile">
          <div>
            <dt>{t('Name', 'الاسم')}</dt>
            <dd>{user?.displayName}</dd>
          </div>
          <div>
            <dt>{t('Username', 'اسم المستخدم')}</dt>
            <dd dir="ltr">{user?.username}</dd>
          </div>
          <div>
            <dt>{t('Access level', 'مستوى الصلاحية')}</dt>
            <dd>
              {user?.role === 'SUPER_ADMIN'
                ? t('Super Admin', 'مدير عام')
                : t('Branch Admin', 'مدير فرع')}
            </dd>
          </div>
        </dl>
      </section>
      <section className="admin-panel">
        <h2>{t('Change password', 'تغيير كلمة المرور')}</h2>
        <p>
          {t(
            'Use a unique passphrase of at least 15 characters. Other signed-in sessions will be closed.',
            'استخدموا عبارة مرور فريدة من 15 حرفًا على الأقل. سيتم إغلاق الجلسات الأخرى.',
          )}
        </p>
        {error && <ErrorState message={error} />}{' '}
        {success && (
          <p role="status" className="admin-success">
            {t(
              'Password changed. Your other sessions were revoked.',
              'تم تغيير كلمة المرور وإلغاء الجلسات الأخرى.',
            )}
          </p>
        )}
        <form
          className="admin-password-form"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const values = new FormData(form);
            setError('');
            setSuccess(false);
            if (values.get('newPassword') !== values.get('confirmPassword')) {
              setError(
                t(
                  'New passwords must match.',
                  'يجب أن تتطابق كلمتا المرور الجديدتان.',
                ),
              );
              return;
            }
            setBusy(true);
            try {
              await request('/auth/change-password', {
                method: 'POST',
                body: JSON.stringify({
                  currentPassword: values.get('currentPassword'),
                  newPassword: values.get('newPassword'),
                }),
              });
              form.reset();
              setSuccess(true);
              await refresh();
            } catch (e) {
              setError(messageOf(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label={t('Current password', 'كلمة المرور الحالية')}>
            <input
              name="currentPassword"
              type="password"
              required
              maxLength={128}
              autoComplete="current-password"
            />
          </Field>
          <Field label={t('New password', 'كلمة المرور الجديدة')}>
            <input
              name="newPassword"
              type="password"
              required
              minLength={15}
              maxLength={128}
              autoComplete="new-password"
            />
          </Field>
          <Field label={t('Confirm new password', 'تأكيد كلمة المرور الجديدة')}>
            <input
              name="confirmPassword"
              type="password"
              required
              minLength={15}
              maxLength={128}
              autoComplete="new-password"
            />
          </Field>
          <button className="admin-button" disabled={busy}>
            {busy
              ? t('Saving…', 'جارٍ الحفظ…')
              : t('Change password', 'تغيير كلمة المرور')}
          </button>
        </form>
      </section>
    </>
  );
}
