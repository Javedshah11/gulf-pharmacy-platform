import { VideoDetailWorkspace } from '@/features/video-management/workspace';
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <VideoDetailWorkspace videoId={(await params).id} />;
}
