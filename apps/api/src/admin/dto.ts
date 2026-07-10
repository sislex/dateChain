import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";

import { ReportStatus } from "../moderation/report.entity";
import { UserStatus } from "../users/user.entity";

export class SetStatusDto {
  @ApiProperty({ enum: UserStatus })
  @IsEnum(UserStatus)
  status!: UserStatus;
}

export class ResolveReportDto {
  @ApiProperty({ enum: [ReportStatus.Resolved, ReportStatus.Dismissed] })
  @IsEnum(ReportStatus)
  status!: ReportStatus.Resolved | ReportStatus.Dismissed;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resolution?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ban?: boolean;
}

export class SetSettingDto {
  @ApiProperty()
  value!: unknown;
}
