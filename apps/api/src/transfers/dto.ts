import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsUUID, Max, Min } from "class-validator";

export class SendTransferDto {
  @ApiProperty({ description: "Recipient user id" })
  @IsUUID()
  toUserId!: string;

  @ApiProperty({ minimum: 1, maximum: 1_000_000, description: "Amount in whole DATE" })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  amount!: number;
}
