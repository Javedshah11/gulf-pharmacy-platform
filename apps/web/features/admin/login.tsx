'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdmin, useText } from './provider';
import { ErrorState, Field, messageOf } from './ui';
export function AdminLogin() {
  const { login, user, toggleLocale, locale } = useAdmin();
  const t = useText();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (user) router.replace('/admin/dashboard');
  }, [user, router]);
  return (
    <main id="home" className="admin-login">
      <section className="admin-login-story">
        <Link href="/" className="admin-brand">
          <span aria-hidden="true">✚</span>
          <div>
            Gulf Pharmacy<small lang="ar">صيدلية الخليج</small>
          </div>
        </Link>
        <div>
          <p className="admin-eyebrow">
            {t('GULF PHARMACY ADMINISTRATION', 'إدارة صيدلية الخليج')}
          </p>
          <h1>
            {t(
              'A thoughtful space to manage your pharmacy.',
              'مساحة لإدارة صيدليتكم بعناية.',
            )}
          </h1>
          <p>
            {t(
              'Your branches. Your team. One secure workspace.',
              'فروعكم وفريقكم في مساحة عمل آمنة.',
            )}
          </p>
        </div>
        <span>
          Dammam · <span lang="ar">الدمام</span>
        </span>
      </section>
      <section className="admin-login-panel">
        <button className="admin-language" onClick={toggleLocale}>
          {locale === 'en' ? 'العربية' : 'English'}
        </button>
        <div className="admin-login-form">
          <p className="admin-eyebrow">{t('WELCOME BACK', 'مرحبًا بعودتكم')}</p>
          <h2>{t('Staff sign in', 'دخول الموظفين')}</h2>
          <p>
            {t(
              'Use the staff account provided by your administrator.',
              'استخدموا حساب الموظف المقدم من المسؤول.',
            )}
          </p>
          {error && <ErrorState message={error} />}
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const data = new FormData(form);
              setBusy(true);
              setError('');
              try {
                await login(
                  String(data.get('username')),
                  String(data.get('password')),
                );
                form.reset();
              } catch (e) {
                setError(messageOf(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label={t('Username', 'اسم المستخدم')}>
              <input
                name="username"
                autoComplete="username"
                required
                maxLength={80}
                dir="ltr"
              />
            </Field>
            <Field label={t('Password', 'كلمة المرور')}>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={128}
              />
            </Field>
            <button className="admin-button full" disabled={busy}>
              {busy
                ? t('Signing in…', 'جارٍ تسجيل الدخول…')
                : t('Sign in', 'تسجيل الدخول')}
            </button>
          </form>
          <p className="admin-help">
            {t(
              'Staff access is managed by the Super Admin. Contact your administrator if you need help signing in.',
              'يدير المسؤول العام حسابات الموظفين. تواصلوا معه عند الحاجة إلى مساعدة في الدخول.',
            )}
          </p>
          <Link href="/">
            {t('Back to Gulf Pharmacy', 'العودة إلى صيدلية الخليج')}
          </Link>
        </div>
      </section>
    </main>
  );
}
