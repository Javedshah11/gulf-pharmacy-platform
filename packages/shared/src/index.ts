export interface Branch {
  id: string;
  nameEn: string;
  nameAr: string;
  slug: string;
  addressEn: string;
  addressAr: string;
  city: string;
  district: string;
  country: string;
  phone: string;
  whatsappUrl: string;
  mapsUrl: string;
  isActive: boolean;
  isPublished: boolean;
  descriptionEn: string;
  descriptionAr: string;
  contactNameEn: string;
  contactNameAr: string;
  postalCode: string;
  openingHours: OpeningPeriod[];
  services: ApprovedService[];
  publicUpdatedAt: string;
}
export interface OpeningPeriod { day: number; opens: string; closes: string; }
export interface ApprovedService { nameEn: string; nameAr: string; }
export const PRIMARY_BRANCH_SLUG = 'gulf-pharmacy-dammam';
export type StaffRole =
  'SUPER_ADMIN' | 'BRANCH_ADMIN' | 'PHARMACIST' | 'MEDICAL_REVIEWER';
export interface StaffProfile {
  id: string;
  username: string;
  displayName: string;
  role: StaffRole;
}
export interface StaffAccount extends StaffProfile {
  isActive: boolean;
  createdAt: string;
  branchIds: string[];
}
