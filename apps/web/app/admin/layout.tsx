import type { Metadata } from 'next';
import { AdminProvider } from '@/features/admin/provider';
import './admin.css';
export const metadata: Metadata = {
  title: 'Staff workspace | Gulf Pharmacy',
  robots: { index: false, follow: false },
};
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminProvider>{children}</AdminProvider>;
}
