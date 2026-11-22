import { Controller, Get, Param, Query } from '@nestjs/common';
import { Matches, MaxLength, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { BranchesService } from './branches.service';
class BranchParams {
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/) @MaxLength(120) slug!: string;
}
class BranchQuery { @IsOptional() @IsString() @MaxLength(100) @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) q?: string; }
@Controller('branches')
export class BranchesController {
  constructor(private readonly service: BranchesService) {}
  @Get() list(@Query() query: BranchQuery) {
    return this.service.list(query.q);
  }
  @Get(':slug') find(@Param() params: BranchParams) {
    return this.service.find(params.slug);
  }
}
