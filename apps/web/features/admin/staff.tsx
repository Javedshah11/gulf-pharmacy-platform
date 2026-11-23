'use client';
import { useState } from 'react';
import type { Branch, StaffAccount } from '@gulf/shared';
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
function StaffWorkspace() {
  const users = useResource<StaffAccount[]>('/admin/users');
  const branches = useResource<Branch[]>('/admin/branches');
  const { request, locale } = useAdmin();
  const t = useText();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [staffRole, setStaffRole] = useState('BRANCH_ADMIN');
  const [target, setTarget] = useState<{
    user: StaffAccount;
    kind: 'status' | 'memberships';
    branchIds?: string[];
  } | null>(null);
  if (users.loading || branches.loading) return <LoadingState />;
  if (users.error || branches.error)
    return (
      <ErrorState
        message={users.error || branches.error}
        retry={() => {
          void users.reload();
          void branches.reload();
        }}
      />
    );
  return (
    <>
      <PageTitle
        eyebrow={t('CENTRAL ADMINISTRATION', 'الإدارة المركزية')}
        title={t('Staff & access', 'الموظفون والصلاحيات')}
        description={t(
          'Create staff accounts with a specific role and branch access.',
          'إنشاء حسابات الموظفين بدور محدد وصلاحيات فروع محددة.',
        )}
      />
      {error && <ErrorState message={error} />}{' '}
      {success && (
        <p role="status" className="admin-success">
          {success}
        </p>
      )}
      <section className="admin-panel">
        <h2>
          {staffRole === 'BRANCH_ADMIN'
            ? t('Create a Branch Admin', 'إنشاء مدير فرع')
            : t('Create Academy staff', 'إنشاء موظف للأكاديمية')}
        </h2>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const values = new FormData(form);
            setBusy(true);
            setError('');
            setSuccess('');
            try {
              const role = String(values.get('role') ?? 'BRANCH_ADMIN');
              await request(
                role === 'BRANCH_ADMIN'
                  ? '/admin/users'
                  : '/admin/academy/staff',
                {
                  method: 'POST',
                  body: JSON.stringify({
                    username: values.get('username'),
                    displayName: values.get('displayName'),
                    password: values.get('password'),
                    branchIds: values.getAll('branchIds'),
                    ...(role === 'BRANCH_ADMIN' ? {} : { role }),
                  }),
                },
              );
              form.reset();
              setStaffRole('BRANCH_ADMIN');
              setSuccess(
                t(
                  role === 'BRANCH_ADMIN'
                    ? 'Branch Admin created. Share credentials through a secure channel.'
                    : 'Academy staff created. Share credentials through a secure channel.',
                  'تم إنشاء الموظف. شاركوا بيانات الدخول عبر قناة آمنة.',
                ),
              );
              await users.reload();
            } catch (e) {
              setError(messageOf(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="admin-form-grid">
            <Field label={t('Role', 'الدور')}>
              <select
                name="role"
                value={staffRole}
                onChange={(e) => setStaffRole(e.target.value)}
              >
                <option value="BRANCH_ADMIN">
                  {t('Branch Admin', 'مدير فرع')}
                </option>
                <option value="PHARMACIST">{t('Pharmacist', 'صيدلي')}</option>
                <option value="MEDICAL_REVIEWER">
                  {t('Medical Reviewer', 'مراجع طبي')}
                </option>
              </select>
            </Field>
            <Field label={t('Full name', 'الاسم الكامل')}>
              <input
                name="displayName"
                required
                maxLength={160}
                autoComplete="off"
              />
            </Field>
            <Field label={t('Username', 'اسم المستخدم')}>
              <input
                name="username"
                required
                pattern="[a-z0-9](?:[a-z0-9._]|-){2,79}"
                maxLength={80}
                autoComplete="off"
                dir="ltr"
              />
            </Field>
            <Field
              label={t(
                'Initial password · 15–128 characters',
                'كلمة المرور الأولية · 15–128 حرفًا',
              )}
            >
              <input
                name="password"
                type="password"
                required
                minLength={15}
                maxLength={128}
                autoComplete="new-password"
              />
            </Field>
          </div>
          <fieldset className="admin-checks">
            <legend>
              {t(
                'Assign branch access · select at least one',
                'تخصيص صلاحية الوصول · اختاروا فرعًا واحدًا على الأقل',
              )}
            </legend>
            {branches.data?.map((branch) => (
              <label key={branch.id}>
                <input type="checkbox" name="branchIds" value={branch.id} />
                {locale === 'ar' ? branch.nameAr : branch.nameEn}
              </label>
            ))}
          </fieldset>
          <button
            className="admin-button"
            disabled={busy || !branches.data?.length}
          >
            {busy
              ? t('Creating…', 'جارٍ الإنشاء…')
              : staffRole === 'BRANCH_ADMIN'
                ? t('Create Branch Admin', 'إنشاء مدير الفرع')
                : t('Create staff account', 'إنشاء حساب موظف')}
          </button>
        </form>
      </section>
      <div className="admin-section-heading">
        <h2>{t('Staff directory', 'دليل الموظفين')}</h2>
        <span>
          {users.data?.length ?? 0} {t('accounts', 'حسابات')}
        </span>
      </div>
      <div className="admin-staff-grid">
        {users.data?.map((user) => (
          <article className="admin-panel admin-person" key={user.id}>
            <div>
              <h3>{user.displayName}</h3>
              <p dir="ltr">@{user.username}</p>
              <span className="admin-tag">
                {user.role === 'SUPER_ADMIN'
                  ? t('Super Admin', 'مدير عام')
                  : user.role === 'PHARMACIST'
                    ? t('Pharmacist', 'صيدلي')
                    : user.role === 'MEDICAL_REVIEWER'
                      ? t('Medical Reviewer', 'مراجع طبي')
                      : t('Branch Admin', 'مدير فرع')}{' '}
                · {user.isActive ? t('Active', 'نشط') : t('Disabled', 'معطل')}
              </span>
            </div>
            {user.role !== 'SUPER_ADMIN' ? (
              <>
                <form
                  key={user.branchIds.join(',')}
                  onSubmit={(event) => {
                    event.preventDefault();
                    const values = new FormData(event.currentTarget);
                    setTarget({
                      user,
                      kind: 'memberships',
                      branchIds: values.getAll('branchIds').map(String),
                    });
                  }}
                >
                  <fieldset className="admin-checks">
                    <legend>{t('Branch access', 'صلاحيات الفروع')}</legend>
                    {branches.data?.map((branch) => (
                      <label key={branch.id}>
                        <input
                          type="checkbox"
                          name="branchIds"
                          value={branch.id}
                          defaultChecked={user.branchIds.includes(branch.id)}
                        />
                        {locale === 'ar' ? branch.nameAr : branch.nameEn}
                      </label>
                    ))}
                  </fieldset>
                  <button className="admin-button secondary" disabled={busy}>
                    {t('Update branch access', 'تحديث صلاحيات الفروع')}
                  </button>
                </form>
                <button
                  className="admin-text-button"
                  disabled={busy}
                  onClick={() => setTarget({ user, kind: 'status' })}
                >
                  {user.isActive
                    ? t('Disable account', 'تعطيل الحساب')
                    : t('Enable account', 'تفعيل الحساب')}
                </button>
              </>
            ) : (
              <p className="admin-help">
                {t(
                  'Global access. Account protection is enabled.',
                  'صلاحية عامة. حماية الحساب مفعلة.',
                )}
              </p>
            )}
          </article>
        ))}
      </div>
      {target && (
        <ConfirmDialog
          title={
            target.kind === 'memberships'
              ? t('Update branch access?', 'تحديث صلاحيات الفروع؟')
              : target.user.isActive
                ? t('Disable this account?', 'تعطيل هذا الحساب؟')
                : t('Enable this account?', 'تفعيل هذا الحساب؟')
          }
          description={t(
            'Existing sessions for this staff member will be revoked. They will need to sign in again.',
            'سيتم إلغاء جلسات هذا الموظف، وسيحتاج إلى تسجيل الدخول مجددًا.',
          )}
          busy={busy}
          onCancel={() => setTarget(null)}
          onConfirm={async () => {
            setBusy(true);
            setError('');
            setSuccess('');
            try {
              await request(
                '/admin/users/' +
                  target.user.id +
                  (target.kind === 'memberships' ? '/memberships' : ''),
                {
                  method: target.kind === 'memberships' ? 'PUT' : 'PATCH',
                  body: JSON.stringify(
                    target.kind === 'memberships'
                      ? { branchIds: target.branchIds }
                      : { isActive: !target.user.isActive },
                  ),
                },
              );
              setTarget(null);
              await users.reload();
              setSuccess(
                t('Staff access updated.', 'تم تحديث صلاحيات الموظف.'),
              );
            } catch (e) {
              setError(messageOf(e));
              setTarget(null);
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </>
  );
}
export function StaffPage() {
  const { user } = useAdmin();
  const t = useText();
  if (user?.role !== 'SUPER_ADMIN')
    return (
      <ErrorState
        message={t(
          'Staff management is restricted to Super Admins.',
          'إدارة الموظفين متاحة للمسؤول العام فقط.',
        )}
      />
    );
  return <StaffWorkspace />;
}
