'use client';
import { useRouter } from 'next/navigation';
import { dictionary } from '@/features/localization/dictionaries';
import type { Locale } from '@/lib/utils/locale';
export function PublicError({ locale }: { locale: Locale }) {
  const d = dictionary(locale);
  const router = useRouter();
  return (
    <div className="public-state" role="alert">
      <p>{d.apiError}</p>
      <button
        className="public-button public-button-outline"
        onClick={() => router.refresh()}
      >
        {d.retry}
      </button>
    </div>
  );
}
