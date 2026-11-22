import { BranchEditor } from '@/features/admin/branches';
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BranchEditor id={id} />;
}
