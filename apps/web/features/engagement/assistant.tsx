'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { AssistantReply } from '@gulf/shared';
import type { Locale } from '@/lib/utils/locale';
import { publicEngagement, recordSignal } from './client-api';
export function PublicEngagement({ locale: l }: { locale: Locale }) {
  const path = usePathname(),
    title = useId();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [reply, setReply] = useState<AssistantReply | null>(null),
    [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const branchSlug = path.match(/^\/(?:en|ar)\/branches\/([a-z0-9-]+)$/)?.[1];
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('gulf:assistant', handler);
    return () => window.removeEventListener('gulf:assistant', handler);
  }, []);
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);
  useEffect(() => {
    let active = true;
    void publicEngagement<{ context: string }>(
      'context' + (branchSlug ? '?branchSlug=' + branchSlug : ''),
    )
      .then((data) => {
        if (active) recordSignal(data.context, 'VISIT');
      })
      .catch(() => undefined);
    const click = (event: MouseEvent) => {
      const link = (event.target as Element).closest?.(
        'a[data-contact-kind][data-branch-slug]',
      );
      if (!link) return;
      const branch = link.getAttribute('data-branch-slug');
      const kind = link.getAttribute('data-contact-kind');
      void publicEngagement<{ context: string }>(
        'context?branchSlug=' + encodeURIComponent(branch ?? ''),
      )
        .then((data) =>
          recordSignal(
            data.context,
            kind === 'whatsapp'
              ? 'WHATSAPP'
              : kind === 'maps'
                ? 'DIRECTIONS'
                : 'CALL',
          ),
        )
        .catch(() => undefined);
    };
    document.addEventListener('click', click);
    return () => {
      active = false;
      document.removeEventListener('click', click);
    };
  }, [path, branchSlug]);
  return (
    <>
      <button
        className="engagement-float"
        aria-expanded={open}
        aria-controls={title}
        onClick={() => setOpen(!open)}
      >
        {l === 'ar' ? 'اسأل مساعد الخليج' : 'Ask Gulf assistant'}{' '}
        <span aria-hidden="true">✦</span>
      </button>
      {open && (
        <section
          className="engagement-assistant"
          id={title}
          role="dialog"
          aria-label={
            l === 'ar' ? 'مساعد الخليج الآلي' : 'Gulf automated assistant'
          }
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
          }}
        >
          <header>
            <div>
              <strong>{l === 'ar' ? 'مساعد الخليج' : 'Gulf assistant'}</strong>
              <p>
                {l === 'ar'
                  ? 'مساعد آلي • ليس صيدلياً'
                  : 'Automated • not a pharmacist'}
              </p>
            </div>
            <button
              aria-label={l === 'ar' ? 'إغلاق المساعد' : 'Close assistant'}
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </header>
          <div className="engagement-answer" aria-live="polite">
            {reply ? (
              <>
                <p>{reply.answer}</p>
                <ul>
                  {reply.sources.map((source, i) => (
                    <li key={i}>
                      <a
                        href={source.url}
                        target={
                          source.url.startsWith('https:') ? '_blank' : undefined
                        }
                        rel="noopener noreferrer"
                      >
                        {source.label} ↗
                      </a>
                      {source.faqId && (
                        <button
                          className="engagement-feedback"
                          onClick={() =>
                            void publicEngagement('assistant/feedback', {
                              faqId: source.faqId,
                              helpful: true,
                            })
                              .then(() =>
                                setError(
                                  l === 'ar'
                                    ? 'شكراً لملاحظتكم.'
                                    : 'Thank you for your feedback.',
                                ),
                              )
                              .catch(() => undefined)
                          }
                        >
                          {l === 'ar' ? 'مفيد' : 'Helpful'}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p>
                {l === 'ar'
                  ? 'أساعدكم في عناوين الفروع وساعات العمل المؤكدة والخدمات المعتمدة والفيديوهات المنشورة. لا تشاركوا معلومات صحية أو شخصية.'
                  : 'I can help with branch addresses, confirmed hours, approved services and published videos. Please do not share health or personal information.'}
              </p>
            )}
            {busy && (
              <p role="status">
                {l === 'ar'
                  ? 'جارٍ البحث في المعلومات المعتمدة…'
                  : 'Checking approved information…'}
              </p>
            )}
            {error && <p role="status">{error}</p>}
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget,
                message = String(new FormData(form).get('message') ?? '');
              setBusy(true);
              setError('');
              try {
                setReply(
                  await publicEngagement<AssistantReply>('assistant', {
                    message,
                    locale: l,
                    ...(branchSlug ? { branchSlug } : {}),
                  }),
                );
                form.reset();
              } catch {
                setError(
                  l === 'ar'
                    ? 'المساعد غير متاح حالياً. تواصلوا مع فرعكم مباشرة.'
                    : 'The assistant is unavailable. Please contact your branch directly.',
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="engagement-sr" htmlFor={title + '-question'}>
              {l === 'ar' ? 'سؤال للمساعد' : 'Ask the assistant'}
            </label>
            <input
              ref={input}
              id={title + '-question'}
              name="message"
              required
              maxLength={1500}
              placeholder={
                l === 'ar' ? 'أين يقع الفرع؟' : 'Where is the branch?'
              }
              autoComplete="off"
            />
            <button disabled={busy}>{l === 'ar' ? 'إرسال' : 'Ask'}</button>
          </form>
          <footer>
            <a href={'/' + l + '/privacy'}>
              {l === 'ar' ? 'الخصوصية' : 'Privacy'}
            </a>{' '}
            ·{' '}
            <a href={'/' + l + '/updates'}>
              {l === 'ar' ? 'التحديثات الاختيارية' : 'Optional updates'}
            </a>
          </footer>
        </section>
      )}
    </>
  );
}
