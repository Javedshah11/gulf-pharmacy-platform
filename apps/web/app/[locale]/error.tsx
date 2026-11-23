'use client';
import { usePathname } from 'next/navigation';
import { dictionary } from '@/features/localization/dictionaries';
export default function ErrorPage({ reset }: { reset: () => void }) {
  const locale = usePathname().split('/')[1] === 'ar' ? 'ar' : 'en';
  const d = dictionary(locale);
  return (
    <main id="home" className="public-shell public-page">
      <div className="public-state" role="alert">
        <p>{d.apiError}</p>
        <button className="public-button" onClick={reset}>
          {d.retry}
        </button>
      </div>
    </main>
  );
}
