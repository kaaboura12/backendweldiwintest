import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class QrLoginDto {
  @ApiProperty({ description: 'QR code for child login' })
  @IsNotEmpty()
  @IsString()
  qrCode: string;
}

