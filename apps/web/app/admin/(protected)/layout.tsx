import { AdminShell } from '@/features/admin/shell';
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
