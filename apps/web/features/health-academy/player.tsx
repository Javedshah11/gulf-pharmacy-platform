'use client';
import { useRef, useState } from 'react';
import type { AcademyVideo } from '@gulf/shared';
import type { Locale } from '@/lib/utils/locale';
import { assetUrl } from './academy';
export function AcademyPlayer({
  video: v,
  locale,
}: {
  video: AcademyVideo;
  locale: Locale;
}) {
  const sent = useRef(new Set<string>());
  const [share, setShare] = useState('');
  function signal(eventType: string) {
    if (sent.current.has(eventType)) return;
    sent.current.add(eventType);
    void fetch(
      new URL(
        '/api/health-academy/videos/' + v.slug + '/events',
        process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
      ),
      {
        method: 'POST',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          'X-Gulf-Request': 'public',
        },
        body: JSON.stringify({ eventType }),
        keepalive: true,
      },
    ).catch(() => undefined);
  }
  return (
    <>
      <video
        className="academy-player"
        controls
        playsInline
        preload="metadata"
        poster={v.hasThumbnail ? assetUrl(v.slug, 'thumbnail') : undefined}
        onPlay={() => signal('VIEW')}
        onEnded={() => signal('COMPLETE')}
        aria-label={locale === 'ar' ? v.titleAr : v.titleEn}
      >
        <source src={assetUrl(v.slug, 'playback')} type="video/mp4" />
        {v.captions.map((l) => (
          <track
            key={l}
            kind="captions"
            srcLang={l}
            label={l === 'ar' ? 'العربية' : 'English'}
            src={assetUrl(v.slug, 'captions-' + l)}
            default={l === locale}
          />
        ))}
      </video>
      <div className="academy-contact">
        <button
          className="public-button secondary"
          onClick={async () => {
            try {
              if (navigator.share)
                await navigator.share({
                  title: locale === 'ar' ? v.titleAr : v.titleEn,
                  url: location.href,
                });
              else {
                await navigator.clipboard.writeText(location.href);
                setShare(locale === 'ar' ? 'تم نسخ الرابط' : 'Link copied');
              }
            } catch {
              setShare(
                locale === 'ar' ? 'تعذّرت المشاركة' : 'Sharing unavailable',
              );
            }
          }}
        >
          {locale === 'ar' ? 'مشاركة' : 'Share'}
        </button>
        <a
          href={'tel:' + v.branch.phone.replace(/\s/g, '')}
          onClick={() => signal('CONTACT')}
        >
          {locale === 'ar' ? 'اتصل بالفرع' : 'Call branch'}
        </a>
        <a
          href={v.branch.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => signal('WHATSAPP')}
        >
          {locale === 'ar' ? 'واتساب' : 'WhatsApp'}
        </a>
        <a
          href={v.branch.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => signal('DIRECTIONS')}
        >
          {locale === 'ar' ? 'الاتجاهات' : 'Directions'}
        </a>
        <span role="status">{share}</span>
      </div>
    </>
  );
}
