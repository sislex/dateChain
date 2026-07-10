import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsOptional, IsString, Length, ValidateIf } from "class-validator";

export enum OtpChannel {
  Phone = "phone",
  Email = "email",
}

export class RequestOtpDto {
  @ApiProperty({ enum: OtpChannel })
  @IsEnum(OtpChannel)
  channel!: OtpChannel;

  @ApiProperty({ example: "+15551234567", description: "Phone (E.164) or email" })
  @IsString()
  @ValidateIf((o: RequestOtpDto) => o.channel === OtpChannel.Email)
  @IsEmail()
  identifier!: string;
}

export class VerifyOtpDto {
  @ApiProperty({ enum: OtpChannel })
  @IsEnum(OtpChannel)
  channel!: OtpChannel;

  @ApiProperty()
  @IsString()
  identifier!: string;

  @ApiProperty({ example: "123456" })
  @IsString()
  @Length(6, 6)
  code!: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}

export class AdminLoginDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  password!: string;

  @ApiProperty({ required: false, description: "TOTP code, required if 2FA is enabled" })
  @IsOptional()
  @IsString()
  @Length(6, 6)
  totp?: string;
}
