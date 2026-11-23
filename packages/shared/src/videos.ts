export const VIDEO_STATUSES = [
  'DRAFT',
  'UPLOADING',
  'PROCESSING',
  'PROCESSING_FAILED',
  'PENDING_REVIEW',
  'CHANGES_REQUESTED',
  'APPROVED',
  'PUBLISHED',
  'REJECTED',
  'ARCHIVED',
] as const;
export type VideoStatus = (typeof VIDEO_STATUSES)[number];
export const ASSET_TYPES = [
  'SOURCE',
  'PLAYBACK',
  'THUMBNAIL',
  'CAPTIONS_EN',
  'CAPTIONS_AR',
] as const;
export type AssetType = (typeof ASSET_TYPES)[number];
export interface VideoCategory {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  isActive: boolean;
  sortOrder: number;
}
export interface VideoReference {
  sourceTitle: string;
  sourceUrl: string;
}
export interface AcademyVideo {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  category: VideoCategory;
  branch: {
    id: string;
    slug: string;
    nameEn: string;
    nameAr: string;
    phone: string;
    whatsappUrl: string;
    mapsUrl: string;
  };
  durationSeconds: number;
  publishedAt: string;
  updatedAt: string;
  authorName: string | null;
  contentKind: 'GENERAL_EDUCATION' | 'REGULATED_PROMOTION';
  hasThumbnail: boolean;
  captions: ('en' | 'ar')[];
  references: VideoReference[];
}
export interface VideoPage {
  items: AcademyVideo[];
  total: number;
  page: number;
  pageSize: number;
}
export interface ManagedVideo {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  categoryId: string;
  authorId: string;
  branchId: string;
  visibilityScope: 'ALL_BRANCHES' | 'BRANCH';
  contentKind: 'GENERAL_EDUCATION' | 'REGULATED_PROMOTION';
  status: VideoStatus;
  revision: number;
  medicalReviewStatus: string;
  complianceStatus: string;
  durationSeconds: number | null;
  currentUploadId: string | null;
  publishedAt: string | null;
  authorAttributionApproved: boolean;
  complianceReference: string | null;
  complianceValidUntil: string | null;
  references: VideoReference[];
  reviews: {
    id: string;
    kind: string;
    decision: string;
    comments: string;
    revision: number;
    reviewedAt: string;
  }[];
  assets: {
    id: string;
    assetType: AssetType;
    mimeType: string;
    fileSize: number;
    processingStatus: string;
    width: number | null;
    height: number | null;
    durationSeconds: number | null;
  }[];
  reviewerIds: string[];
  processingError: string | null;
}
