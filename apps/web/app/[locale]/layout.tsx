import { requireLocale } from '@/features/localization/locale';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import './public.css';
export const dynamic = 'force-dynamic';
export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) { const locale = requireLocale((await params).locale); return <div className="public-site"><Header locale={locale}/>{children}<Footer locale={locale}/></div>; }
