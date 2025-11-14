import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../user/schemas/user.schema';

export type ChildDocument = Child & Document;

export enum DeviceType {
  PHONE = 'PHONE',
  WATCH = 'WATCH',
}

export enum ChildStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Schema({ timestamps: true })
export class Child {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  parent: Types.ObjectId; // main linked parent (father/mother)

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  linkedParents: Types.ObjectId[]; // other linked parents (e.g. mom + dad)

  @Prop({ default: null })
  avatarUrl: string;

  @Prop({
    type: {
      lat: { type: Number },
      lng: { type: Number },
      updatedAt: { type: Date },
    },
    default: null,
  })
  location?: { lat: number; lng: number; updatedAt: Date };

  @Prop({ default: null })
  deviceId: string; // e.g. iPhone or Apple Watch unique ID

  @Prop({ enum: DeviceType, default: DeviceType.PHONE })
  deviceType: DeviceType;

  @Prop({ default: false })
  isOnline: boolean;

  @Prop({ enum: ChildStatus, default: ChildStatus.ACTIVE })
  status: ChildStatus;

  @Prop({ type: String, default: null })
  qrCode: string | null; // QR used for child login or linking

  @Prop({ type: Object, default: {} })
  additionalAttributes: Record<string, any>;
}

export const ChildSchema = SchemaFactory.createForClass(Child);

