import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsMongoId, IsArray, IsNumber, IsBoolean, ValidateNested } from 'class-validator';
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

export class CreateChildDto {
  @ApiProperty({ example: 'Jane' })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({ required: false, description: 'Parent user ID (only for ADMIN, otherwise uses current user)' })
  @IsOptional()
  @IsMongoId()
  parent?: string;

  @ApiProperty({ required: false, description: 'Array of additional parent IDs', type: [String] })
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

  @ApiProperty({ enum: DeviceType, required: false, default: DeviceType.PHONE })
  @IsOptional()
  @IsEnum(DeviceType)
  deviceType?: DeviceType;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @ApiProperty({ enum: ChildStatus, required: false, default: ChildStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ChildStatus)
  status?: ChildStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  qrCode?: string;
}

