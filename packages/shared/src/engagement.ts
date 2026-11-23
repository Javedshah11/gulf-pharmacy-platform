export const CONSENT_VERSION = 'gulf-whatsapp-2026-11-v1';
export const CONSENT_TEXT = {
  en: 'I voluntarily agree to receive WhatsApp updates from Gulf Pharmacy for my selected branch and topics. Subscription is optional and separate from website access. I can withdraw at any time using my private management link or by contacting the branch. My request stays unverified until the branch confirms my incoming WhatsApp message.',
  ar: 'أوافق طوعاً على تلقي تحديثات واتساب من صيدلية الخليج للفرع والمواضيع المختارة. الاشتراك اختياري ومنفصل عن استخدام الموقع. يمكنني سحب موافقتي في أي وقت عبر رابط الإدارة الخاص أو بالتواصل مع الفرع. يبقى طلبي غير موثّق حتى يؤكد الفرع رسالة واتساب الواردة مني.',
};
export type EngagementBranch = {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  addressEn: string;
  addressAr: string;
  phone: string;
  whatsappUrl: string;
  mapsUrl: string;
};
export type AssistantReply = {
  automated: true;
  answer: string;
  mode: 'DETERMINISTIC' | 'OLLAMA_SELECTION' | 'SAFETY' | 'UNAVAILABLE';
  sources: { label: string; url: string; faqId?: string }[];
  branch: EngagementBranch | null;
};
export type PublicCampaign = {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  campaignType: string;
  startsAt: string;
  endsAt: string;
  videoSlug: string | null;
  branch: EngagementBranch;
  context: string;
};
export type ScanResult = {
  code: string;
  destination: string;
  source: string;
  branch: EngagementBranch;
  campaign: PublicCampaign | null;
  context: string;
};
export type SubscriptionReceipt = {
  requestId: string;
  managementToken: string;
  confirmationCode: string;
  expiresAt: string;
  state: 'PENDING';
  whatsappUrl: string;
};
