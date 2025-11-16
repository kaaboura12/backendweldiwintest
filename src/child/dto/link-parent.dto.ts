import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LinkParentByQrDto {
  @ApiProperty({ 
    example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
    description: 'The QR code of the child to link to'
  })
  @IsString()
  @IsNotEmpty()
  qrCode: string;
}

