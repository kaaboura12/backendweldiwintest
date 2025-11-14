import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsArray, IsMongoId, IsNumber, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DeviceType, ChildStatus } from '../schemas/child.schema';

class LocationDto {
  @ApiProperty({ example: 37.7749 })
  @IsNumber()
  lat: number;

  @ApiProperty({ example: -122.4194 })
  @IsNumber()
  lng: number;

  @ApiProperty({ required: false })
  @IsOptional()
  updatedAt?: Date;
}

export class UpdateChildDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false, description: 'Array of linked parent IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  linkedParents?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiProperty({ required: false, type: LocationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({ enum: DeviceType, required: false })
  @IsOptional()
  @IsEnum(DeviceType)
  deviceType?: DeviceType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @ApiProperty({ enum: ChildStatus, required: false })
  @IsOptional()
  @IsEnum(ChildStatus)
  status?: ChildStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  qrCode?: string;
}

