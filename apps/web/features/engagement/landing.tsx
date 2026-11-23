'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import type {
  ScanResult,
  PublicCampaign,
  EngagementBranch,
} from '@gulf/shared';
import type { Locale } from '@/lib/utils/locale';
import { recordSignal } from './client-api';
export function EngagementActions({
  branch: b,
  context,
  locale: l,
}: {
  branch: EngagementBranch;
  context: string;
  locale: Locale;
}) {
  return (
    <div className="engagement-actions">
      <a
        className="public-button"
        href={b.whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => recordSignal(context, 'WHATSAPP')}
      >
        {l === 'ar' ? 'فتح واتساب' : 'Open WhatsApp'}
      </a>
      <a
        className="public-button public-button-outline"
        href={b.mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => recordSignal(context, 'DIRECTIONS')}
      >
        {l === 'ar' ? 'الاتجاهات' : 'Get directions'}
      </a>
      <a
        className="public-button public-button-plain"
        href={'tel:' + b.phone.replace(/\s/g, '')}
        onClick={() => recordSignal(context, 'CALL')}
      >
        {l === 'ar' ? 'اتصل بالفرع' : 'Call branch'}
      </a>
    </div>
  );
}
export function ScanLanding({
  data,
  locale: l,
}: {
  data: ScanResult;
  locale: Locale;
}) {
  useEffect(() => {
    recordSignal(data.context, 'QR_SCAN');
  }, [data.context]);
  const b = data.branch;
  return (
    <main id="home" className="public-shell engagement-page">
      <p className="engagement-eyebrow">
        {l === 'ar' ? 'مرحباً بكم في صيدلية الخليج' : 'WELCOME TO GULF PHARMACY'}
      </p>
      <h1>{l === 'ar' ? b.nameAr : b.nameEn}</h1>
      <p className="engagement-lead">
        {l === 'ar' ? b.addressAr : b.addressEn}
      </p>
      <EngagementActions branch={b} context={data.context} locale={l} />
      <p className="engagement-muted">
        {l === 'ar'
          ? 'تصفحوا الموقع دون اشتراك. فتح واتساب لا يرسل رسالة ولا يشترك بكم تلقائياً.'
          : 'Browse without subscribing. Opening WhatsApp does not send a message or subscribe you.'}
      </p>
      <div className="engagement-tiles">
        <Link href={'/' + l + '/branches/' + b.slug}>
          <span aria-hidden="true">⌖</span>
          <h2>{l === 'ar' ? 'تفاصيل الفرع' : 'Your branch details'}</h2>
          <p>
            {l === 'ar'
              ? 'معلومات موثّقة للتخطيط لزيارتكم.'
              : 'Verified information to plan your visit.'}
          </p>
        </Link>
        <Link href={'/' + l + '/health-academy?branch=' + b.slug}>
          <span aria-hidden="true">▷</span>
          <h2>{l === 'ar' ? 'الأكاديمية الصحية' : 'Health Academy'}</h2>
          <p>
            {l === 'ar'
              ? 'فيديوهات تثقيفية بعد المراجعة والاعتماد.'
              : 'Educational videos, reviewed before publication.'}
          </p>
        </Link>
        <button
          onClick={() => window.dispatchEvent(new Event('gulf:assistant'))}
        >
          <span aria-hidden="true">✦</span>
          <h2>
            {l === 'ar' ? 'اسأل المساعد الآلي' : 'Ask our automated assistant'}
          </h2>
          <p>
            {l === 'ar'
              ? 'إجابات من معلومات عامة معتمدة.'
              : 'Answers from approved public information.'}
          </p>
        </button>
      </div>
      {data.campaign && (
        <section className="engagement-panel">
          <p>
            {l === 'ar' ? 'محتوى الفرع المعتمد' : 'Approved branch content'}
          </p>
          <h2>{l === 'ar' ? data.campaign.titleAr : data.campaign.titleEn}</h2>
          <Link href={'/' + l + '/campaigns/' + data.campaign.slug}>
            {l === 'ar' ? 'عرض التفاصيل' : 'View details'}
          </Link>
        </section>
      )}
      <aside className="engagement-panel">
        <h2>
          {l === 'ar' ? 'تحديثات باختياركم' : 'Updates, only if you choose'}
        </h2>
        <p>
          {l === 'ar'
            ? 'يمكنكم طلب الاشتراك الاختياري في تحديثات الفرع. يتطلب الطلب تأكيداً منفصلاً عبر واتساب.'
            : 'You may request optional branch updates. A separate WhatsApp confirmation is required.'}
        </p>
        <Link
          className="public-button public-button-outline"
          href={'/' + l + '/updates?branch=' + b.slug + '&qr=' + data.code}
        >
          {l === 'ar' ? 'خيارات التحديثات' : 'Explore optional updates'}
        </Link>
      </aside>
    </main>
  );
}
export function CampaignLanding({
  data: c,
  locale: l,
}: {
  data: PublicCampaign;
  locale: Locale;
}) {
  useEffect(() => {
    recordSignal(c.context, 'CAMPAIGN_VIEW');
  }, [c.context]);
  return (
    <main id="home" className="public-shell engagement-page">
      <p className="engagement-eyebrow">
        {l === 'ar' ? c.branch.nameAr : c.branch.nameEn}
      </p>
      <h1>{l === 'ar' ? c.titleAr : c.titleEn}</h1>
      {c.campaignType === 'PROMOTION' && (
        <p className="engagement-badge">
          {l === 'ar'
            ? 'محتوى ترويجي مصرّح به'
            : 'Authorized promotional content'}
        </p>
      )}
      <p className="engagement-copy">{l === 'ar' ? c.bodyAr : c.bodyEn}</p>
      {c.videoSlug && (
        <Link
          className="public-button public-button-outline"
          href={'/' + l + '/health-academy/' + c.videoSlug}
        >
          {l === 'ar' ? 'شاهد الفيديو المعتمد' : 'Watch reviewed video'}
        </Link>
      )}
      <EngagementActions branch={c.branch} context={c.context} locale={l} />
      <Link href={'/' + l + '/branches/' + c.branch.slug}>
        {l === 'ar' ? 'تفاصيل الفرع' : 'Branch details'}
      </Link>
      <p className="engagement-muted">
        {l === 'ar'
          ? 'للمعلومات العامة؛ لا يحل هذا المحتوى محل الاستشارة الصحية الفردية.'
          : 'General information; this content does not replace individual professional advice.'}
      </p>
    </main>
  );
}
