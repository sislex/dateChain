import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsISO8601, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from "class-validator";

export class ProposeDateDto {
  @ApiProperty({ description: "User to invite (any deck candidate)" })
  @IsUUID()
  inviteeId!: string;

  @ApiProperty({ minimum: 1, maximum: 1_000_000, description: "Amount in whole DATE" })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  amount!: number;

  @ApiPropertyOptional({ description: "Optional opening message" })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  message?: string;

  @ApiPropertyOptional({ description: "Planned date/time of the meeting (ISO 8601)" })
  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;

  @ApiPropertyOptional({ description: "Planned meeting place" })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  location?: string;
}
