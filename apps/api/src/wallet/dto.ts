import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, Max, Min } from "class-validator";

export class TopUpDto {
  @ApiProperty({ minimum: 1, maximum: 10_000, description: "Amount in whole DATE" })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  amount!: number;
}
