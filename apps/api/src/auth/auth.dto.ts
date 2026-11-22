import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';
export class LoginDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9._-]{2,79}$/)
  username!: string;
  @IsString() @Length(1, 128) password!: string;
}
export class ChangePasswordDto {
  @IsString() @Length(1, 128) currentPassword!: string;
  @IsString() @Length(15, 128) newPassword!: string;
}
