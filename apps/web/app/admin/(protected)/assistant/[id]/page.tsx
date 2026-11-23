import { ContentWorkspace } from '@/features/marketing/workspace';
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ContentWorkspace kind="faqs" id={(await params).id} />;
}
