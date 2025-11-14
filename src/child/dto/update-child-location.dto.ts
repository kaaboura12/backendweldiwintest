import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty } from 'class-validator';

export class UpdateChildLocationDto {
  @ApiProperty({ example: 37.7749 })
  @IsNotEmpty()
  @IsNumber()
  lat: number;

  @ApiProperty({ example: -122.4194 })
  @IsNotEmpty()
  @IsNumber()
  lng: number;
}


