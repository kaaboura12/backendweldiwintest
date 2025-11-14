import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Room, RoomDocument } from './schemas/room.schema';
import { Message, MessageDocument, MessageType } from './schemas/message.schema';
import { Child, ChildDocument } from '../child/schemas/child.schema';
import { User, UserDocument, UserRole } from '../user/schemas/user.schema';

interface SendTextDto {
  roomId: string;
  text: string;
  senderModel: 'User' | 'Child';
  senderId: string;
}

interface SendAudioDto {
  roomId: string;
  senderModel: 'User' | 'Child';
  senderId: string;
  audio: {
    url: string;
    durationSec?: number | null;
    mimeType?: string | null;
    sizeBytes?: number | null;
    cloudinaryPublicId?: string | null;
  };
}

interface SendSignalDto {
  roomId: string;
  senderModel: 'User' | 'Child';
  senderId: string;
  type: 'CALL_OFFER' | 'CALL_ANSWER' | 'ICE_CANDIDATE';
  payload: Record<string, any>;
}

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Room.name) private readonly roomModel: Model<RoomDocument>,
    @InjectModel(Message.name) private readonly messageModel: Model<MessageDocument>,
    @InjectModel(Child.name) private readonly childModel: Model<ChildDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  /**
   * Get or create a room for a parent-child pair
   */
  async getOrCreateRoom(parentId: string, childId: string): Promise<RoomDocument> {
    const parentObjectId = new Types.ObjectId(parentId);
    const childObjectId = new Types.ObjectId(childId);

    // Verify child exists and is linked to parent
    const child = await this.childModel.findById(childId);
    if (!child) {
      throw new NotFoundException('Child not found');
    }
    const isLinked =
      child.parent?.equals(parentObjectId) ||
      (Array.isArray(child.linkedParents) && child.linkedParents.some((p) => p.equals(parentObjectId)));
    if (!isLinked) {
      throw new ForbiddenException('Parent is not linked to this child');
    }

    // Find or create room
    let room = await this.roomModel
      .findOne({ parent: parentObjectId, child: childObjectId })
      .populate('child', 'firstName lastName avatarUrl')
      .populate('parent', 'firstName lastName avatarUrl')
      .populate('invitedParents', 'firstName lastName avatarUrl');
    if (!room) {
      await this.roomModel.create({
        parent: parentObjectId,
        child: childObjectId,
        isActive: true,
      });
      // Refetch with populate after creation
      room = await this.roomModel
        .findOne({ parent: parentObjectId, child: childObjectId })
        .populate('child', 'firstName lastName avatarUrl')
        .populate('parent', 'firstName lastName avatarUrl')
        .populate('invitedParents', 'firstName lastName avatarUrl');
      if (!room) {
        throw new Error('Failed to create room');
      }
    } else if (!room.isActive) {
      room.isActive = true;
      await room.save();
      // Refetch with populate after update
      room = await this.roomModel
        .findById(room._id)
        .populate('child', 'firstName lastName avatarUrl')
        .populate('parent', 'firstName lastName avatarUrl')
        .populate('invitedParents', 'firstName lastName avatarUrl');
      if (!room) {
        throw new Error('Failed to refetch room');
      }
    }
    return room;
  }

  /**
   * Assert user has access to room
   */
  private async assertRoomAccess(room: RoomDocument, currentUser: any): Promise<void> {
    if (currentUser.role === UserRole.ADMIN) {
      return; // Admin can access any room
    }

    if (currentUser.type === 'child') {
      // Child can only access their own room
      if (!room.child.equals(new Types.ObjectId(currentUser.id))) {
        throw new ForbiddenException('You can only access your own room');
      }
    } else {
      // Parent can access if they are:
      // 1. The main parent
      // 2. An invited parent
      const userObjectId = new Types.ObjectId(currentUser.id);
      const isMainParent = room.parent.equals(userObjectId);
      const isInvitedParent = Array.isArray(room.invitedParents) && 
        room.invitedParents.some((p) => p.equals(userObjectId));
      
      if (!isMainParent && !isInvitedParent) {
        throw new ForbiddenException('You can only access rooms with your children or rooms you are invited to');
      }
    }
  }

  /**
   * List all rooms for a parent (one per child)
   * Includes rooms where user is main parent OR invited parent
   */
  async listRoomsForParent(parentId: string, currentUser: any): Promise<any[]> {
    if (currentUser.role !== UserRole.ADMIN && currentUser.id !== parentId) {
      throw new ForbiddenException('You can only view your own rooms');
    }
    const parentObjectId = new Types.ObjectId(parentId);
    return this.roomModel
      .find({
        $or: [
          { parent: parentObjectId, isActive: true },
          { invitedParents: parentObjectId, isActive: true },
        ],
      })
      .populate('child', 'firstName lastName avatarUrl')
      .populate('parent', 'firstName lastName avatarUrl')
      .populate('invitedParents', 'firstName lastName avatarUrl')
      .sort({ 'lastMessage.createdAt': -1 })
      .lean();
  }

  /**
   * Get room for a child (their room with parent)
   */
  async getRoomForChild(childId: string, currentUser: any): Promise<RoomDocument> {
    if (currentUser.type !== 'child') {
      throw new ForbiddenException('This endpoint is only for children');
    }
    if (currentUser.id !== childId) {
      throw new ForbiddenException('You can only access your own room');
    }

    const child = await this.childModel.findById(childId);
    if (!child) {
      throw new NotFoundException('Child not found');
    }

    const room = await this.roomModel
      .findOne({ child: new Types.ObjectId(childId), isActive: true })
      .populate('child', 'firstName lastName avatarUrl')
      .populate('parent', 'firstName lastName avatarUrl')
      .populate('invitedParents', 'firstName lastName avatarUrl');

    if (!room) {
      // Auto-create room if it doesn't exist
      return this.getOrCreateRoom(child.parent.toString(), childId);
    }

    return room;
  }

  /**
   * Get room by ID with access check
   */
  async getRoomById(roomId: string, currentUser: any): Promise<RoomDocument> {
    const room = await this.roomModel
      .findById(roomId)
      .populate('child', 'firstName lastName avatarUrl')
      .populate('parent', 'firstName lastName avatarUrl')
      .populate('invitedParents', 'firstName lastName avatarUrl');
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    await this.assertRoomAccess(room, currentUser);
    return room;
  }

  /**
   * Invite a parent to join a room
   * Only the main parent can invite other parents
   */
  async inviteParent(roomId: string, invitedParentId: string, currentUser: any): Promise<RoomDocument> {
    const room = await this.roomModel.findById(roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Only main parent can invite
    if (!room.parent.equals(new Types.ObjectId(currentUser.id))) {
      throw new ForbiddenException('Only the main parent can invite other parents');
    }

    // Verify invited parent exists and is a parent
    const invitedParent = await this.userModel.findById(invitedParentId);
    if (!invitedParent) {
      throw new NotFoundException('Invited parent not found');
    }
    if (invitedParent.role !== UserRole.PARENT) {
      throw new ForbiddenException('Can only invite users with PARENT role');
    }

    // Check if already invited
    const invitedParentObjectId = new Types.ObjectId(invitedParentId);
    if (room.parent.equals(invitedParentObjectId)) {
      throw new ForbiddenException('Cannot invite the main parent');
    }
    if (Array.isArray(room.invitedParents) && room.invitedParents.some((p) => p.equals(invitedParentObjectId))) {
      throw new ForbiddenException('Parent is already invited to this room');
    }

    // Add to invited parents
    await this.roomModel.findByIdAndUpdate(roomId, {
      $addToSet: { invitedParents: invitedParentObjectId },
    });

    // Return updated room with populated fields
    const updatedRoom = await this.roomModel
      .findById(roomId)
      .populate('child', 'firstName lastName avatarUrl')
      .populate('parent', 'firstName lastName avatarUrl')
      .populate('invitedParents', 'firstName lastName avatarUrl');
    
    if (!updatedRoom) {
      throw new NotFoundException('Room not found after update');
    }
    return updatedRoom;
  }

  /**
   * Remove an invited parent from a room
   * Only the main parent can remove invited parents
   */
  async removeInvitedParent(roomId: string, invitedParentId: string, currentUser: any): Promise<RoomDocument> {
    const room = await this.roomModel.findById(roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Only main parent can remove
    if (!room.parent.equals(new Types.ObjectId(currentUser.id))) {
      throw new ForbiddenException('Only the main parent can remove invited parents');
    }

    const invitedParentObjectId = new Types.ObjectId(invitedParentId);
    
    // Remove from invited parents
    await this.roomModel.findByIdAndUpdate(roomId, {
      $pull: { invitedParents: invitedParentObjectId },
    });

    // Return updated room with populated fields
    const updatedRoom = await this.roomModel
      .findById(roomId)
      .populate('child', 'firstName lastName avatarUrl')
      .populate('parent', 'firstName lastName avatarUrl')
      .populate('invitedParents', 'firstName lastName avatarUrl');
    
    if (!updatedRoom) {
      throw new NotFoundException('Room not found after update');
    }
    return updatedRoom;
  }

  /**
   * Validate that sender is authorized for this room
   * Allows: main parent, invited parent, or child
   */
  private validateSender(room: RoomDocument, senderModel: 'User' | 'Child', senderId: string): void {
    const senderObjectId = new Types.ObjectId(senderId);

    if (senderModel === 'Child') {
      // Child must match the room's child
      if (!room.child.equals(senderObjectId)) {
        throw new ForbiddenException('senderId must match the child in this room');
      }
    } else if (senderModel === 'User') {
      // User must be main parent OR invited parent
      const isMainParent = room.parent.equals(senderObjectId);
      const isInvitedParent = Array.isArray(room.invitedParents) && 
        room.invitedParents.some((p) => p.equals(senderObjectId));
      
      if (!isMainParent && !isInvitedParent) {
        throw new ForbiddenException('senderId must be the main parent or an invited parent in this room');
      }
    }
  }

  /**
   * List messages in a room
   */
  async listMessages(roomId: string, currentUser: any, limit = 50, beforeId?: string): Promise<any[]> {
    const room = await this.roomModel.findById(roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    await this.assertRoomAccess(room, currentUser);

    const query: any = { room: new Types.ObjectId(roomId) };
    if (beforeId) {
      query._id = { $lt: new Types.ObjectId(beforeId) };
    }
    return this.messageModel.find(query).sort({ _id: -1 }).limit(limit).lean();
  }

  /**
   * List audio (vocal) messages in a room with optional sender filters
   */
  async listAudioMessages(
    roomId: string,
    currentUser: any,
    options?: { sender?: 'parent' | 'child' | 'me' | 'all' },
  ): Promise<any[]> {
    const room = await this.roomModel.findById(roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    await this.assertRoomAccess(room, currentUser);

    const query: any = {
      room: room._id,
      type: MessageType.AUDIO,
    };

    switch (options?.sender) {
      case 'parent':
        query.senderModel = 'User';
        break;
      case 'child':
        query.senderModel = 'Child';
        break;
      case 'me':
        query.senderModel = currentUser.type === 'child' ? 'Child' : 'User';
        query.senderId = new Types.ObjectId(currentUser.id);
        break;
      default:
        break;
    }

    return this.messageModel
      .find(query)
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Send a text message
   */
  async sendText(dto: SendTextDto, currentUser: any): Promise<any> {
    const room = await this.roomModel.findById(dto.roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    await this.assertRoomAccess(room, currentUser);

    // Validate sender (allows main parent, invited parent, or child)
    this.validateSender(room, dto.senderModel, dto.senderId);

    const msg = await this.messageModel.create({
      room: room._id,
      senderModel: dto.senderModel,
      senderId: new Types.ObjectId(dto.senderId),
      type: MessageType.TEXT,
      text: dto.text,
    });

    // Update room's last message
    await this.roomModel.findByIdAndUpdate(room._id, {
      $set: {
        lastMessage: {
          text: dto.text,
          senderModel: dto.senderModel,
          senderId: msg.senderId,
          createdAt: new Date(),
        },
      },
    });

    return msg.toObject();
  }

  /**
   * Send an audio message
   */
  async sendAudio(dto: SendAudioDto, currentUser: any): Promise<any> {
    const room = await this.roomModel.findById(dto.roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    await this.assertRoomAccess(room, currentUser);

    // Validate sender (allows main parent, invited parent, or child)
    this.validateSender(room, dto.senderModel, dto.senderId);

    const msg = await this.messageModel.create({
      room: room._id,
      senderModel: dto.senderModel,
      senderId: new Types.ObjectId(dto.senderId),
      type: MessageType.AUDIO,
      audio: dto.audio,
    });

    // Update room's last message
    await this.roomModel.findByIdAndUpdate(room._id, {
      $set: {
        lastMessage: {
          text: '[Audio]',
          senderModel: dto.senderModel,
          senderId: msg.senderId,
          createdAt: new Date(),
        },
      },
    });

    return msg.toObject();
  }

  /**
   * Send call signaling message (WebRTC)
   */
  async sendSignal(dto: SendSignalDto, currentUser: any): Promise<any> {
    const room = await this.roomModel.findById(dto.roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    await this.assertRoomAccess(room, currentUser);

    // Validate sender (allows main parent, invited parent, or child)
    this.validateSender(room, dto.senderModel, dto.senderId);

    const msg = await this.messageModel.create({
      room: room._id,
      senderModel: dto.senderModel,
      senderId: new Types.ObjectId(dto.senderId),
      type: MessageType[dto.type],
      signalingPayload: dto.payload,
    });

    return msg.toObject();
  }
}

