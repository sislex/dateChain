import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsEthereumAddress,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

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

export class SetServiceWalletDto {
  @ApiProperty({ description: "0x-prefixed Ethereum address for service commissions" })
  @IsEthereumAddress()
  address!: string;
}

export class SetTransferFeeDto {
  @ApiProperty({ minimum: 0, maximum: 5000, description: "Transfer commission in basis points" })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(5000)
  feeBps!: number;
}
