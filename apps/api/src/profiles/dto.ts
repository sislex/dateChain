import { Gender } from "@datechain/types";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from "class-validator";

export class UpsertProfileDto {
  @ApiProperty()
  @IsString()
  @Length(1, 100)
  displayName!: string;

  @ApiProperty({ example: "1996-04-12", description: "ISO date; user must be 18+" })
  @IsDateString()
  birthDate!: string;

  @ApiProperty({ enum: Gender })
  @IsEnum(Gender)
  gender!: Gender;

  @ApiProperty({ enum: Gender, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(Gender, { each: true })
  interestedIn!: Gender[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 500)
  bio?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  interests?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 120)
  job?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 120)
  school?: string;

  @ApiPropertyOptional({ minimum: 100, maximum: 250 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(250)
  heightCm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 120)
  lookingFor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  lng?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  discoverable?: boolean;
}

export class ReorderPhotosDto {
  @ApiProperty({ type: [String], description: "Photo ids in the desired order" })
  @IsArray()
  @IsString({ each: true })
  order!: string[];
}
