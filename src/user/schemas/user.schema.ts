import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  ADMIN = 'ADMIN',
  PARENT = 'PARENT',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: false, default: null })
  phoneNumber: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, enum: UserRole, default: UserRole.PARENT })
  role: UserRole;

  @Prop({ default: null })
  avatarUrl: string;

  @Prop({ enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ type: String, default: null })
  verificationCode: string | null;

  @Prop({ type: Date, default: null })
  verificationCodeExpiresAt: Date | null;

  @Prop({ type: String, enum: ['email', 'sms'], default: null })
  verificationChannel: 'email' | 'sms' | null;

  @Prop({ type: String, default: null })
  passwordResetCode: string | null;

  @Prop({ type: Date, default: null })
  passwordResetExpiresAt: Date | null;

  @Prop({ type: Date, default: null })
  lastCodeSentAt: Date | null;

  @Prop({ type: String, default: null, unique: false, sparse: true })
  googleId: string | null;

  @Prop({ type: Object, default: {} })
  additionalAttributes: Record<string, any>;
}

export const UserSchema = SchemaFactory.createForClass(User);

