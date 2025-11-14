import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { User, UserDocument } from '../../user/schemas/user.schema';
import { Child, ChildDocument } from '../../child/schemas/child.schema';

export interface JwtPayload {
  sub: string;
  email?: string;
  role: string;
  type: 'user' | 'child';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Child.name) private childModel: Model<ChildDocument>,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: (() => {
        const secret = configService.get<string>('JWT_SECRET') || 'your-secret-key-change-in-production';
        console.log('🔐 JWT Strategy Secret loaded (verifying):', secret ? `${secret.substring(0, 20)}...` : 'NOT SET');
        return secret;
      })(),
    });
  }

  async validate(payload: JwtPayload) {
    // Validate payload structure
    if (!payload || !payload.sub || !payload.type) {
      throw new UnauthorizedException('Invalid token payload');
    }

    if (payload.type === 'user') {
      const user = await this.userModel.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      if (user.status !== 'ACTIVE') {
        throw new UnauthorizedException('User account is inactive');
      }
      return { 
        id: (user._id as any).toString(), 
        email: user.email, 
        role: user.role, 
        type: 'user' 
      };
    } else if (payload.type === 'child') {
      const child = await this.childModel.findById(payload.sub);
      if (!child) {
        throw new UnauthorizedException('Child not found');
      }
      if (child.status !== 'ACTIVE') {
        throw new UnauthorizedException('Child account is inactive');
      }
      return { 
        id: (child._id as any).toString(), 
        parentId: (child.parent as any).toString(), 
        type: 'child' 
      };
    }
    throw new UnauthorizedException(`Invalid token type: ${payload.type}`);
  }
}

