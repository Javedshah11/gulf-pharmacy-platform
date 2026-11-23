import { Injectable } from '@nestjs/common';
import { and, asc, branches, eq, or, ilike } from '@gulf/database';
import { DatabaseService } from '../infrastructure/database.service';
@Injectable()
export class BranchesRepository {
  constructor(private readonly database: DatabaseService) {}
  list(query?: string) {
    const pattern = '%' + (query ?? '').replace(/[\\%_]/g, '\\$&') + '%';
    return this.database.db
      .select()
      .from(branches)
      .where(
        and(
          eq(branches.isActive, true),
          eq(branches.isPublished, true),
          query
            ? or(
                ilike(branches.nameEn, pattern),
                ilike(branches.nameAr, pattern),
                ilike(branches.addressEn, pattern),
                ilike(branches.addressAr, pattern),
                ilike(branches.city, pattern),
                ilike(branches.district, pattern),
              )
            : undefined,
        ),
      )
      .orderBy(asc(branches.nameEn));
  }
  async find(slug: string) {
    const [branch] = await this.database.db
      .select()
      .from(branches)
      .where(
        and(
          eq(branches.slug, slug),
          eq(branches.isActive, true),
          eq(branches.isPublished, true),
        ),
      )
      .limit(1);
    return branch;
  }
}
