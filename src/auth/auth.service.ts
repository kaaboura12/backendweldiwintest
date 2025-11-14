import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';
import { User, UserDocument, UserRole } from '../user/schemas/user.schema';
import { Child, ChildDocument } from '../child/schemas/child.schema';
import { RegisterDto } from './dto/register.dto';
import { EmailService } from '../notification/email.service';
import { SmsService } from '../notification/sms.service';
import { VerifyAccountDto, ResendCodeDto, ForgotPasswordRequestDto, ResetPasswordDto } from './dto/verify.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Child.name) private childModel: Model<ChildDocument>,
    private jwtService: JwtService,
    private emailService: EmailService,
    private smsService: SmsService,
    private configService: ConfigService,
  ) {
    // Initialize Google OAuth client
    const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    this.googleClient = new OAuth2Client(googleClientId);
  }

  private generateCode(length = 6): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.userModel.findOne({ email: registerDto.email });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = new this.userModel({
      ...registerDto,
      password: hashedPassword,
      role: registerDto.role || UserRole.PARENT,
      isVerified: false,
    });

    // Generate verification code
    const code = this.generateCode(6);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    const channel: 'email' | 'sms' = registerDto.verificationChannel || 'email';

    user.verificationCode = code;
    user.verificationCodeExpiresAt = expiresAt as any;
    user.verificationChannel = channel as any;
    user.lastCodeSentAt = new Date();

    await user.save();

    // Send code
    if (channel === 'email') {
      await this.emailService.send(
        user.email,
        'Verify your WeldiWin account',
        `<p>Hello ${user.firstName},</p><p>Your verification code is <b>${code}</b>. It expires in 15 minutes.</p>`
      );
    } else if (channel === 'sms') {
      await this.smsService.send(
        user.phoneNumber,
        `WeldiWin verification code: ${code} (expires in 15 minutes)`
      );
    }

    const { password, ...result } = user.toObject();
    return {
      user: result,
      message: 'Registration successful. Verification code sent.',
    };
  }

  async login(loginDto: LoginDto) {
    // Only users can login via email/password (children use QR code)
    const user = await this.userModel.findOne({ email: loginDto.email });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active and verified
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is inactive');
    }

    // ⚠️ COMMENTED OUT - Allow unverified users to login
    // if (!user.isVerified) {
    //   throw new UnauthorizedException('Account not verified');
    // }

    const payload = {
      sub: (user._id as any).toString(),
      email: user.email,
      role: user.role,
      type: 'user',
    };

    const { password, ...result } = user.toObject();

    return {
      user: result,
      access_token: this.jwtService.sign(payload),
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.userModel.findOne({ email });
    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  async loginWithQrCode(qrCode: string) {
    // Find child by QR code
    const child = await this.childModel.findOne({ qrCode });
    if (!child) {
      throw new UnauthorizedException('Invalid QR code');
    }

    // Check if child is active
    if (child.status !== 'ACTIVE') {
      throw new UnauthorizedException('Child account is inactive');
    }

    // Generate JWT token for child
    const payload = {
      sub: (child._id as any).toString(),
      role: 'CHILD',
      type: 'child',
    };

    const { qrCode: qr, ...result } = child.toObject();

    return {
      child: result,
      access_token: this.jwtService.sign(payload),
    };
  }

  private async findUserByIdentifier(email?: string, phoneNumber?: string): Promise<UserDocument | null> {
    if (email) return this.userModel.findOne({ email });
    if (phoneNumber) return this.userModel.findOne({ phoneNumber });
    return null;
  }

  async verifyAccount(dto: VerifyAccountDto) {
    const user = await this.findUserByIdentifier(dto.email, dto.phoneNumber);
    if (!user) throw new UnauthorizedException('User not found');
    if (!user.verificationCode || !user.verificationCodeExpiresAt) {
      throw new BadRequestException('No verification in progress');
    }
    if (new Date(user.verificationCodeExpiresAt).getTime() < Date.now()) {
      throw new BadRequestException('Verification code expired');
    }
    if (user.verificationCode !== dto.code) {
      throw new UnauthorizedException('Invalid verification code');
    }
    user.isVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpiresAt = null as any;
    await user.save({ validateModifiedOnly: true });
    
    // Generate JWT token for automatic login after verification
    const payload = {
      sub: (user._id as any).toString(),
      email: user.email,
      role: user.role,
      type: 'user',
    };
    
    const { password, ...result } = user.toObject();
    return { 
      user: result, 
      message: 'Account verified successfully',
      access_token: this.jwtService.sign(payload)
    };
  }

  async resendVerificationCode(dto: ResendCodeDto) {
    const user = await this.findUserByIdentifier(dto.email, dto.phoneNumber);
    if (!user) throw new UnauthorizedException('User not found');
    if (user.isVerified) return { message: 'Account already verified' };

    // rate limit: 60 seconds
    if (user.lastCodeSentAt && Date.now() - new Date(user.lastCodeSentAt).getTime() < 60_000) {
      throw new BadRequestException('Please wait before requesting another code');
    }

    const code = this.generateCode(6);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const channel: 'email' | 'sms' = dto.channel || user.verificationChannel || 'email';

    user.verificationCode = code;
    user.verificationCodeExpiresAt = expiresAt as any;
    user.verificationChannel = channel as any;
    user.lastCodeSentAt = new Date();
    await user.save({ validateModifiedOnly: true });

    if (channel === 'email') {
      await this.emailService.send(
        user.email,
        'Your verification code',
        `<p>Your verification code is <b>${code}</b>. It expires in 15 minutes.</p>`
      );
    } else {
      await this.smsService.send(user.phoneNumber, `Verification code: ${code} (expires in 15 minutes)`);
    }
    return { message: 'Verification code sent' };
  }

  async requestPasswordReset(dto: ForgotPasswordRequestDto) {
    const user = await this.findUserByIdentifier(dto.email, dto.phoneNumber);
    if (!user) return { message: 'If an account exists, a code has been sent' };

    const code = this.generateCode(6);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const channel: 'email' | 'sms' = dto.channel || 'email';

    user.passwordResetCode = code;
    user.passwordResetExpiresAt = expiresAt as any;
    user.lastCodeSentAt = new Date();
    await user.save({ validateModifiedOnly: true });

    if (channel === 'email') {
      await this.emailService.send(
        user.email,
        'Reset your password',
        `<p>Your password reset code is <b>${code}</b>. It expires in 15 minutes.</p>`
      );
    } else {
      await this.smsService.send(user.phoneNumber, `Password reset code: ${code} (15 minutes)`);
    }
    return { message: 'If an account exists, a code has been sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.findUserByIdentifier(dto.email, dto.phoneNumber);
    if (!user) throw new UnauthorizedException('Invalid reset code');
    if (!user.passwordResetCode || !user.passwordResetExpiresAt) {
      throw new BadRequestException('No reset in progress');
    }
    if (new Date(user.passwordResetExpiresAt).getTime() < Date.now()) {
      throw new BadRequestException('Reset code expired');
    }
    if (user.passwordResetCode !== dto.code) {
      throw new UnauthorizedException('Invalid reset code');
    }
    user.password = await bcrypt.hash(dto.newPassword, 10);
    user.passwordResetCode = null;
    user.passwordResetExpiresAt = null as any;
    await user.save({ validateModifiedOnly: true });
    return { message: 'Password has been reset successfully' };
  }

  async googleAuth(googleAuthDto: GoogleAuthDto) {
    try {
      // Verify the Google ID token
      const ticket = await this.googleClient.verifyIdToken({
        idToken: googleAuthDto.idToken,
        audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('Invalid Google token');
      }

      const { email, given_name, family_name, picture, sub: googleId } = payload;

      if (!email) {
        throw new BadRequestException('Email not provided by Google');
      }

      // Check if user exists
      let user = await this.userModel.findOne({ email });

      if (!user) {
        // Create new user with Google Sign-In
        user = new this.userModel({
          email,
          firstName: given_name || 'User',
          lastName: family_name || '',
          password: await bcrypt.hash(Math.random().toString(36), 10), // Random password (won't be used)
          role: UserRole.PARENT,
          isVerified: true, // Google accounts are pre-verified
          status: 'ACTIVE',
          avatarUrl: picture || null,
          googleId,
        });
        await user.save();
      } else {
        // Update existing user with Google ID if not set
        if (!user.googleId) {
          user.googleId = googleId;
          user.isVerified = true; // Verify user if they sign in with Google
          if (picture && !user.avatarUrl) {
            user.avatarUrl = picture;
          }
          await user.save({ validateModifiedOnly: true });
        }
      }

      // Check user status
      if (user.status !== 'ACTIVE') {
        throw new UnauthorizedException('User account is not active');
      }

      // Generate JWT token
      const token = this.jwtService.sign({
        sub: (user._id as any).toString(),
        email: user.email,
        role: user.role,
        type: 'user',
      });

      return {
        access_token: token,
        user: {
          _id: (user._id as any).toString(),
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
        },
      };
    } catch (error: any) {
      console.error('Google Auth Error:', error.message);
      throw new UnauthorizedException('Google authentication failed: ' + error.message);
    }
  }
}

