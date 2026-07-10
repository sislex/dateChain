import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

export class SendMessageDto {
  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @Length(1, 2000)
  text!: string;
}
