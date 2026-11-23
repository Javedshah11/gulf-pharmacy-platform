import { VideoEditor } from '@/features/video-management/workspace';
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <VideoEditor videoId={(await params).id} />;
}
