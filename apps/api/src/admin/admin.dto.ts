import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsString,
  IsUUID,
  IsUrl,
  Length,
  Matches,
  MaxLength,
  ArrayMinSize,
  ValidateIf,
  ValidateNested,
  IsInt,
  Min,
  Max,
} from 'class-validator';
const IsOptional = () => ValidateIf((_object, value) => value !== undefined);
export class IdParams {
  @IsUUID() id!: string;
}
export class MembershipDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  branchIds!: string[];
}
export class CreateStaffDto extends MembershipDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9._-]{2,79}$/)
  username!: string;
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 160)
  displayName!: string;
  @IsString() @Length(15, 128) password!: string;
  @ArrayMinSize(1) declare branchIds: string[];
}
export class UpdateStaffDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 160)
  displayName?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class OpeningPeriodDto {
  @IsInt() @Min(0) @Max(6) day!: number;
  @Matches(/^([01][0-9]|2[0-3]):[0-5][0-9]$/) opens!: string;
  @Matches(/^([01][0-9]|2[0-3]):[0-5][0-9]$/) closes!: string;
}
export class ApprovedServiceDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 160)
  nameEn!: string;
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 160)
  nameAr!: string;
}
export class UpdateBranchDto {
  @IsOptional() @IsBoolean() isPublished?: boolean;
  @IsOptional() @IsString() @MaxLength(2000) descriptionEn?: string;
  @IsOptional() @IsString() @MaxLength(2000) descriptionAr?: string;
  @IsOptional() @IsString() @MaxLength(160) contactNameEn?: string;
  @IsOptional() @IsString() @MaxLength(160) contactNameAr?: string;
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9 -]{0,20}$/)
  postalCode?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => OpeningPeriodDto)
  openingHours?: OpeningPeriodDto[];
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => ApprovedServiceDto)
  services?: ApprovedServiceDto[];
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(160) nameEn?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(160) nameAr?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(500) addressEn?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(500) addressAr?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100) district?: string;
  @IsOptional() @Matches(/^\+[1-9][0-9 ]{7,28}$/) phone?: string;
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @Matches(/^https:\/\/wa\.me\/[0-9]+$/)
  @MaxLength(300)
  whatsappUrl?: string;
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @Matches(
    /^https:\/\/(?:goo\.gl\/maps\/|maps\.app\.goo\.gl\/|(?:www\.)?google\.com\/maps(?:\/|\?))/,
  )
  @MaxLength(1000)
  mapsUrl?: string;
}
