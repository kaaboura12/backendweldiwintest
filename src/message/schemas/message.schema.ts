import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document;

export enum MessageType {
  TEXT = 'TEXT',
  AUDIO = 'AUDIO',
  CALL_OFFER = 'CALL_OFFER', // WebRTC offer SDP
  CALL_ANSWER = 'CALL_ANSWER', // WebRTC answer SDP
  ICE_CANDIDATE = 'ICE_CANDIDATE', // ICE candidate payload
}

@Schema({ timestamps: true })
export class Message {
  // Reference to Room (one room per parent-child pair)
  @Prop({ type: Types.ObjectId, ref: 'Room', required: true, index: true })
  room: Types.ObjectId;

  // Polymorphic sender: either User (parent) or Child
  @Prop({ required: true, enum: ['User', 'Child'] })
  senderModel: 'User' | 'Child';

  @Prop({ type: Types.ObjectId, required: true })
  senderId: Types.ObjectId;

  @Prop({ enum: MessageType, required: true, default: MessageType.TEXT })
  type: MessageType;

  @Prop({ type: String, default: null })
  text?: string;

  // For audio messages: stored file URL and duration in seconds
  @Prop({
    type: {
      url: { type: String, default: null },
      durationSec: { type: Number, default: null },
      mimeType: { type: String, default: null },
      sizeBytes: { type: Number, default: null },
      cloudinaryPublicId: { type: String, default: null },
    },
    default: {},
  })
  audio?: {
    url: string | null;
    durationSec: number | null;
    mimeType: string | null;
    sizeBytes: number | null;
    cloudinaryPublicId?: string | null;
  };

  // For call signaling messages (SDP or ICE)
  @Prop({ type: Object, default: null })
  signalingPayload?: Record<string, any> | null;

  @Prop({ default: false })
  isDelivered: boolean;

  @Prop({ default: false })
  isRead: boolean;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Index for efficient querying by room and timestamp
MessageSchema.index({ room: 1, createdAt: -1 });

