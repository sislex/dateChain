import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, IsUUID, Length } from "class-validator";

import { ReportCategory } from "./report.entity";

export class CreateReportDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  reportedId!: string;

  @ApiProperty({ enum: ReportCategory })
  @IsEnum(ReportCategory)
  category!: ReportCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 500)
  reason?: string;
}

export class BlockUserDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  userId!: string;
}
