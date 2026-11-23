'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAdmin, useText } from './provider';
import { LoadingState, ErrorState, messageOf } from './ui';
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, status, locale, toggleLocale, logout, refresh } = useAdmin();
  const t = useText();
  const router = useRouter();
  const path = usePathname();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (status === 'anonymous') router.replace('/admin/login');
  }, [status, router]);
  if (status === 'loading') return <LoadingState />;
  if (status === 'error')
    return (
      <ErrorState
        message={t(
          'We couldn’t verify your session. Check the API connection.',
          'تعذر التحقق من الجلسة. يرجى التحقق من الاتصال.',
        )}
        retry={() => void refresh()}
      />
    );
  if (!user || status !== 'ready') return <LoadingState />;
  const links = [
    {
      href: '/admin/marketing',
      label: t('Customer engagement', 'تواصل العملاء'),
      icon: '✦',
    },
    {
      href: '/admin/videos',
      label: t('Health Academy', 'الأكاديمية الصحية'),
      icon: '▷',
    },
    ...(['SUPER_ADMIN', 'BRANCH_ADMIN'].includes(user.role)
      ? [
          {
            href: '/admin/dashboard',
            label: t('Overview', 'نظرة عامة'),
            icon: '◫',
          },
          {
            href: '/admin/branches',
            label: t('Branches', 'الفروع'),
            icon: '⌖',
          },
        ]
      : []),
    ...(user.role === 'SUPER_ADMIN'
      ? [
          {
            href: '/admin/staff',
            label: t('Staff & access', 'الموظفون والصلاحيات'),
            icon: '♧',
          },
        ]
      : []),
    { href: '/admin/settings', label: t('My settings', 'إعداداتي'), icon: '⚙' },
  ];
  return (
    <div className="admin-workspace">
      <aside className="admin-sidebar">
        <Link
          className="admin-brand"
          href={
            ['PHARMACIST', 'MEDICAL_REVIEWER'].includes(user.role)
              ? '/admin/videos'
              : '/admin/dashboard'
          }
        >
          <span aria-hidden="true">✚</span>
          <div>
            Gulf Pharmacy<small lang="ar">صيدلية الخليج</small>
          </div>
        </Link>
        <p className="admin-eyebrow">
          {t('STAFF WORKSPACE', 'مساحة عمل الموظفين')}
        </p>
        <nav aria-label={t('Administration', 'الإدارة')}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={
                path === link.href || path.startsWith(link.href + '/')
                  ? 'page'
                  : undefined
              }
            >
              <span aria-hidden="true">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <span className="admin-role">
            {user.role === 'SUPER_ADMIN'
              ? t('Super Admin', 'مدير عام')
              : user.role === 'PHARMACIST'
                ? t('Pharmacist', 'صيدلي')
                : user.role === 'MEDICAL_REVIEWER'
                  ? t('Medical Reviewer', 'مراجع طبي')
                  : t('Branch Admin', 'مدير فرع')}
          </span>
          <p>{t('Manage with care.', 'إدارة بعناية.')}</p>
          <Link href="/">
            {t('Visit public website', 'زيارة الموقع العام')}
          </Link>
        </div>
      </aside>
      <div className="admin-content">
        <div className="admin-topbar">
          <div>
            <strong>{user.displayName}</strong>
            <span>@{user.username}</span>
          </div>
          <div className="admin-actions">
            <button className="admin-language" onClick={toggleLocale}>
              {locale === 'en' ? 'العربية' : 'English'}
            </button>
            <button
              className="admin-button secondary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError('');
                try {
                  await logout();
                } catch (e) {
                  setError(messageOf(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t('Sign out', 'تسجيل الخروج')}
            </button>
          </div>
        </div>
        <main id="home" className="admin-main">
          {error && <ErrorState message={error} />} {children}
        </main>
      </div>
    </div>
  );
}
