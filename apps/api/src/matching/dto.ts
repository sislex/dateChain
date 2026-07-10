import { SwipeAction } from "@datechain/types";
import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsUUID } from "class-validator";

export class SwipeDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  targetId!: string;

  @ApiProperty({ enum: SwipeAction })
  @IsEnum(SwipeAction)
  action!: SwipeAction;
}
