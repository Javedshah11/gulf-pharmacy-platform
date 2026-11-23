'use client';
import { useEffect, useState } from 'react';
import {
  CONSENT_TEXT,
  CONSENT_VERSION,
  type Branch,
  type SubscriptionReceipt,
} from '@gulf/shared';
import type { Locale } from '@/lib/utils/locale';
import { publicEngagement } from './client-api';
export function SubscriptionForm({
  branches,
  locale: l,
  initialBranch = '',
  qrCode,
}: {
  branches: Branch[];
  locale: Locale;
  initialBranch?: string;
  qrCode?: string;
}) {
  const [receipt, setReceipt] = useState<SubscriptionReceipt | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [state, setState] = useState('');
  const [manage, setManage] = useState<{
    requestId: string;
    managementToken: string;
  } | null>(null);
  useEffect(() => {
    const value = new URLSearchParams(location.hash.slice(1)).get('manage');
    if (value) {
      const [requestId, managementToken] = value.split('.');
      if (requestId && managementToken)
        setManage({ requestId, managementToken });
    }
  }, []);
  const token =
    manage ??
    (receipt
      ? {
          requestId: receipt.requestId,
          managementToken: receipt.managementToken,
        }
      : null);
  return (
    <section className="engagement-panel">
      <h2>
        {l === 'ar' ? 'تحديثات واتساب اختيارية' : 'Optional WhatsApp updates'}
      </h2>
      <p>{CONSENT_TEXT[l]}</p>
      <p className="engagement-muted">
        {l === 'ar'
          ? 'لا نجمع حالات صحية أو اهتمامات علاجية. لا توجد رسائل تسويقية آلية مفعّلة حالياً.'
          : 'We do not collect health conditions or treatment interests. Automated marketing sending is currently disabled.'}
      </p>
      {error && <p role="alert">{error}</p>}
      {receipt ? (
        <div role="status">
          <h3>
            {l === 'ar'
              ? 'الطلب بانتظار التأكيد'
              : 'Your request is pending confirmation'}
          </h3>
          <p>
            {l === 'ar'
              ? 'افتحوا واتساب وأرسلوا الرسالة بأنفسكم. يجب أن يتحقق فريق الفرع من الرقم الوارد ورمز التأكيد قبل اعتماد الاشتراك.'
              : 'Open WhatsApp and send the message yourself. Branch staff must verify the incoming sender number and confirmation code before confirming your subscription.'}
          </p>
          <p>
            {l === 'ar' ? 'رمز التأكيد' : 'Confirmation code'}:{' '}
            <code>{receipt.confirmationCode}</code>
          </p>
          <a
            className="public-button"
            href={receipt.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {l === 'ar'
              ? 'مراجعة رسالة التأكيد في واتساب'
              : 'Review confirmation message in WhatsApp'}
          </a>
          <p>
            {l === 'ar'
              ? 'احتفظوا برابط الإدارة الخاص ولا تشاركوه:'
              : 'Keep this private management link and do not share it:'}
          </p>
          <a
            className="engagement-private-link"
            href={
              '/' +
              l +
              '/updates#manage=' +
              receipt.requestId +
              '.' +
              receipt.managementToken
            }
          >
            {l === 'ar'
              ? 'رابط إدارة الاشتراك الخاص'
              : 'Private subscription management link'}
          </a>
        </div>
      ) : (
        !manage && (
          <form
            className="engagement-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError('');
              const f = new FormData(e.currentTarget);
              try {
                setReceipt(
                  await publicEngagement<SubscriptionReceipt>('subscriptions', {
                    branchSlug: f.get('branch'),
                    phone: f.get('phone'),
                    locale: l,
                    consent: f.get('consent') === 'on',
                    consentVersion: CONSENT_VERSION,
                    scopes: f.getAll('scopes'),
                    ...(qrCode ? { qrCode } : {}),
                  }),
                );
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : 'Request unavailable',
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              {l === 'ar' ? 'الفرع' : 'Branch'}
              <select name="branch" required defaultValue={initialBranch}>
                <option value="">
                  {l === 'ar' ? 'اختر الفرع' : 'Choose branch'}
                </option>
                {branches.map((b) => (
                  <option key={b.id} value={b.slug}>
                    {l === 'ar' ? b.nameAr : b.nameEn}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {l === 'ar'
                ? 'رقم واتساب سعودي (+9665…)'
                : 'Saudi WhatsApp number (+9665…)'}
              <input
                name="phone"
                type="tel"
                dir="ltr"
                required
                pattern="\+9665[0-9]{8}"
                placeholder="+9665XXXXXXXX"
                autoComplete="tel"
              />
            </label>
            <fieldset>
              <legend>
                {l === 'ar'
                  ? 'مواضيع اختيارية غير صحية شخصية'
                  : 'Optional topics, without personal health interests'}
              </legend>
              {(['ANNOUNCEMENTS', 'EDUCATION', 'PROMOTIONS'] as const).map(
                (scope, i) => (
                  <label className="engagement-check" key={scope}>
                    <input type="checkbox" name="scopes" value={scope} />
                    {l === 'ar'
                      ? [
                          'إعلانات الفرع العامة',
                          'محتوى تثقيفي معتمد',
                          'عروض مصرّح بها عند السماح قانونياً',
                        ][i]
                      : [
                          'General announcements',
                          'Approved education',
                          'Authorized promotions, where legally permitted',
                        ][i]}
                  </label>
                ),
              )}
            </fieldset>
            <label className="engagement-check">
              <input type="checkbox" name="consent" required />
              {l === 'ar'
                ? 'أوافق طوعاً على النص أعلاه وأفهم أن تأكيد الرقم مطلوب.'
                : 'I voluntarily agree to the notice above and understand that number confirmation is required.'}
            </label>
            <button
              className="public-button"
              disabled={busy || !branches.length}
            >
              {busy
                ? l === 'ar'
                  ? 'جارٍ الطلب…'
                  : 'Requesting…'
                : l === 'ar'
                  ? 'طلب الاشتراك الاختياري'
                  : 'Request optional subscription'}
            </button>
          </form>
        )
      )}
      {token && (
        <div className="engagement-management">
          <h3>
            {l === 'ar' ? 'إدارة الطلب الخاص' : 'Manage your private request'}
          </h3>
          <div className="engagement-actions">
            <button
              className="public-button public-button-outline"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const response = await publicEngagement<{ state: string }>(
                    'subscriptions/state',
                    token,
                  );
                  setState(response.state);
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Unavailable');
                } finally {
                  setBusy(false);
                }
              }}
            >
              {l === 'ar' ? 'التحقق من الحالة' : 'Check confirmation state'}
            </button>
            <button
              className="public-button public-button-outline"
              disabled={busy || state === 'WITHDRAWN'}
              onClick={async () => {
                setBusy(true);
                try {
                  const result = await publicEngagement<{ state: string }>(
                    'subscriptions/withdraw',
                    token,
                  );
                  setState(result.state);
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Unavailable');
                } finally {
                  setBusy(false);
                }
              }}
            >
              {l === 'ar'
                ? 'سحب الموافقة / إلغاء الطلب'
                : 'Withdraw consent / cancel request'}
            </button>
          </div>
          <p role="status">{state}</p>
        </div>
      )}
    </section>
  );
}
