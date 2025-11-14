import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleAuthDto {
  @ApiProperty({ 
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMzQ1Njc4OTAiLCJ0eXAiOiJKV1QifQ...',
    description: 'Google ID token received from Google Sign-In on iOS'
  })
  @IsNotEmpty()
  @IsString()
  idToken: string;
}


