import { Injectable, NotFoundException } from '@nestjs/common';
import type { Branch } from '@gulf/shared';
import { BranchesRepository } from './branches.repository';
function publicBranch(
  row: Awaited<ReturnType<BranchesRepository['list']>>[number],
): Branch {
  return {
    id: row.id,
    nameEn: row.nameEn,
    nameAr: row.nameAr,
    slug: row.slug,
    addressEn: row.addressEn,
    addressAr: row.addressAr,
    city: row.city,
    district: row.district,
    country: row.country,
    phone: row.phone,
    whatsappUrl: row.whatsappUrl,
    mapsUrl: row.mapsUrl,
    isActive: row.isActive,
    isPublished: true,
    descriptionEn: row.descriptionEn ?? '',
    descriptionAr: row.descriptionAr ?? '',
    contactNameEn: row.contactNameEn ?? '',
    contactNameAr: row.contactNameAr ?? '',
    postalCode: row.postalCode ?? '',
    openingHours: row.openingHours ?? [],
    services: row.services ?? [],
    publicUpdatedAt: row.publicUpdatedAt?.toISOString() ?? '',
  };
}
@Injectable()
export class BranchesService {
  constructor(private readonly repository: BranchesRepository) {}
  async list(query?: string) {
    return (await this.repository.list(query)).map(publicBranch);
  }
  async find(slug: string) {
    const branch = await this.repository.find(slug);
    if (!branch) throw new NotFoundException('Branch not found');
    return publicBranch(branch);
  }
}
