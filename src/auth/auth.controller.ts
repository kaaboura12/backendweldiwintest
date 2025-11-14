import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { QrLoginDto } from './dto/qr-login.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { VerifyAccountDto, ResendCodeDto, ForgotPasswordRequestDto, ResetPasswordDto } from './dto/verify.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user with email/password' })
  @ApiResponse({ status: 200, description: 'Successfully logged in' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('login/google')
  @ApiOperation({ summary: 'Login/Register user with Google' })
  @ApiResponse({ status: 200, description: 'Successfully authenticated with Google' })
  @ApiResponse({ status: 401, description: 'Invalid Google token' })
  async googleAuth(@Body() googleAuthDto: GoogleAuthDto) {
    return this.authService.googleAuth(googleAuthDto);
  }

  @Post('login/qr')
  @ApiOperation({ summary: 'Login child with QR code' })
  @ApiResponse({ status: 200, description: 'Child successfully logged in' })
  @ApiResponse({ status: 401, description: 'Invalid QR code' })
  async loginWithQr(@Body() qrLoginDto: QrLoginDto) {
    return this.authService.loginWithQrCode(qrLoginDto.qrCode);
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify account with code (email or SMS)' })
  @ApiResponse({ status: 200, description: 'Account verified' })
  async verify(@Body() dto: VerifyAccountDto) {
    return this.authService.verifyAccount(dto);
  }

  @Post('resend-code')
  @ApiOperation({ summary: 'Resend verification code' })
  async resend(@Body() dto: ResendCodeDto) {
    return this.authService.resendVerificationCode(dto);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset code (email or SMS)' })
  async forgotPassword(@Body() dto: ForgotPasswordRequestDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with code' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}

