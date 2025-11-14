import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../user/schemas/user.schema';
import { Child } from '../../child/schemas/child.schema';

export type RoomDocument = Room & Document;

@Schema({ timestamps: true })
export class Room {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  parent: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Child', required: true, index: true })
  child: Types.ObjectId;

  // Last message preview for quick display
  @Prop({
    type: {
      text: { type: String, default: null },
      senderModel: { type: String, enum: ['User', 'Child'], default: null },
      senderId: { type: Types.ObjectId, default: null },
      createdAt: { type: Date, default: null },
    },
    default: {},
  })
  lastMessage?: {
    text: string | null;
    senderModel: 'User' | 'Child' | null;
    senderId: Types.ObjectId | null;
    createdAt: Date | null;
  };

  // Unique constraint: one room per parent-child pair
  @Prop({ type: Boolean, default: false })
  isActive: boolean;

  // Invited parents who can also access this room
  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  invitedParents: Types.ObjectId[];
}

export const RoomSchema = SchemaFactory.createForClass(Room);

// Create unique index to ensure one room per parent-child pair
RoomSchema.index({ parent: 1, child: 1 }, { unique: true });

