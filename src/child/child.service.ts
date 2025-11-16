import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import { Child, ChildDocument } from './schemas/child.schema';
import { User, UserRole } from '../user/schemas/user.schema';
import { Room, RoomDocument } from '../message/schemas/room.schema';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { UpdateChildLocationDto } from './dto/update-child-location.dto';
import { DangerZoneService } from '../danger-zone/danger-zone.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class ChildService {
  constructor(
    @InjectModel(Child.name) private childModel: Model<ChildDocument>,
    @InjectModel(User.name) private userModel: Model<any>,
    @InjectModel(Room.name) private roomModel: Model<RoomDocument>,
    @Inject(forwardRef(() => DangerZoneService))
    private dangerZoneService: DangerZoneService,
    private notificationService: NotificationService,
  ) {}

  async create(createChildDto: CreateChildDto, currentUser: any): Promise<Child> {
    // If current user is a PARENT, they can only create children for themselves
    // If current user is ADMIN, they can create children for any user
    let parentId = currentUser.id;
    
    if (currentUser.role === UserRole.ADMIN) {
      // ADMIN can specify parent in the DTO
      if (createChildDto.parent) {
        parentId = createChildDto.parent;
      }
    } else if (currentUser.type === 'child') {
      throw new ForbiddenException('Children cannot create other children');
    } else if (currentUser.role !== UserRole.PARENT) {
      throw new ForbiddenException('Only PARENT or ADMIN can create children');
    }

    // Verify parent exists
    const parent = await this.userModel.findById(parentId);
    if (!parent) {
      throw new NotFoundException('Parent user not found');
    }

    // Verify parent is actually a PARENT role
    if (parent.role !== UserRole.PARENT) {
      throw new ForbiddenException('Children can only be assigned to users with PARENT role');
    }

    const { parent: parentFromDto, ...childData } = createChildDto;
    
    // Generate unique QR code for child login if not provided
    let qrCode = createChildDto.qrCode;
    if (!qrCode) {
      // Generate a secure random QR code (32 characters)
      qrCode = crypto.randomBytes(16).toString('hex');
    }
    
    const child = new this.childModel({
      ...childData,
      parent: parentId,
      qrCode,
    });

    const savedChild = await child.save();
    
    // Auto-create room for parent-child pair
    try {
      await this.roomModel.create({
        parent: new Types.ObjectId(parentId),
        child: savedChild._id,
        isActive: true,
      });
    } catch (error: any) {
      // Ignore if room already exists (unique constraint)
      if (error.code !== 11000) {
        console.error('Error creating room for child:', error.message);
      }
    }
    
    // Return child with QR code included (for parent to use for child login)
    return savedChild;
  }

  async findAll(currentUser: any): Promise<Child[]> {
    // ADMIN can see all children, PARENT can only see their own children
    if (currentUser.role === UserRole.ADMIN) {
      return this.childModel.find().populate('parent', '-password').populate('linkedParents', '-password').exec();
    } else if (currentUser.type === 'child') {
      // Children can only see themselves
      return this.childModel.find({ _id: currentUser.id }).populate('parent', '-password').populate('linkedParents', '-password').exec();
    } else {
      // PARENT sees children where they are the parent OR in linkedParents
      return this.childModel.find({
        $or: [
          { parent: currentUser.id },
          { linkedParents: currentUser.id }
        ]
      }).populate('parent', '-password').populate('linkedParents', '-password').exec();
    }
  }

  async findOne(id: string, currentUser: any): Promise<Child> {
    const child = await this.childModel.findById(id).populate('parent', '-password').populate('linkedParents', '-password').exec();
    if (!child) {
      throw new NotFoundException('Child not found');
    }

    // ADMIN can see any child, PARENT can only see their own children
    if (currentUser.role === UserRole.ADMIN) {
      return child;
    } else if (currentUser.type === 'child') {
      // Children can only see themselves
      if (currentUser.id !== id) {
        throw new ForbiddenException('You can only access your own profile');
      }
      return child;
    } else {
      // PARENT can only see children where they are parent or linkedParent
      const isParent = child.parent.toString() === currentUser.id;
      const isLinkedParent = child.linkedParents.some(p => p.toString() === currentUser.id);
      
      if (!isParent && !isLinkedParent) {
        throw new ForbiddenException('You can only access your own children');
      }
      return child;
    }
  }

  async update(id: string, updateChildDto: UpdateChildDto, currentUser: any): Promise<Child> {
    const child = await this.childModel.findById(id);
    if (!child) {
      throw new NotFoundException('Child not found');
    }

    // ADMIN can update any child, PARENT can only update their own children
    if (currentUser.role !== UserRole.ADMIN) {
      if (currentUser.type === 'child') {
        // Children can only update themselves
        if (currentUser.id !== id) {
          throw new ForbiddenException('You can only update your own profile');
        }
      } else {
        // PARENT can only update children where they are parent or linkedParent
        const isParent = child.parent.toString() === currentUser.id;
        const isLinkedParent = child.linkedParents.some(p => p.toString() === currentUser.id);
        
        if (!isParent && !isLinkedParent) {
          throw new ForbiddenException('You can only update your own children');
        }
      }
    }

    // Use findByIdAndUpdate for partial updates
    const updatedChild = await this.childModel.findByIdAndUpdate(
      id,
      { $set: updateChildDto },
      { new: true, runValidators: true }
    ).populate('parent', '-password').populate('linkedParents', '-password').exec();

    if (!updatedChild) {
      throw new NotFoundException('Child not found after update');
    }

    return updatedChild;
  }

  async remove(id: string, currentUser: any): Promise<void> {
    const child = await this.childModel.findById(id);
    if (!child) {
      throw new NotFoundException('Child not found');
    }

    // Only ADMIN can delete children, or PARENT can delete their own children
    if (currentUser.role === UserRole.ADMIN) {
      // ADMIN can delete any child
    } else if (currentUser.type === 'child') {
      throw new ForbiddenException('Children cannot delete accounts');
    } else {
      // PARENT can only delete children where they are the main parent
      if (child.parent.toString() !== currentUser.id) {
        throw new ForbiddenException('You can only delete your own children');
      }
    }

    await this.childModel.findByIdAndDelete(id);
  }

  async getProfile(currentUser: any): Promise<Child> {
    if (currentUser.type !== 'child') {
      throw new ForbiddenException('This endpoint is only for children');
    }

    const child = await this.childModel.findById(currentUser.id).populate('parent', '-password').populate('linkedParents', '-password').exec();
    if (!child) {
      throw new NotFoundException('Child not found');
    }
    return child;
  }

  async getChildrenByParent(parentId: string, currentUser: any): Promise<Child[]> {
    // ADMIN can see children of any parent
    // PARENT can only see their own children
    if (currentUser.role !== UserRole.ADMIN && currentUser.id !== parentId) {
      throw new ForbiddenException('You can only view your own children');
    }

    return this.childModel.find({
      $or: [
        { parent: parentId },
        { linkedParents: parentId }
      ]
    }).populate('parent', '-password').populate('linkedParents', '-password').exec();
  }

  async updateLocation(id: string, updateChildLocationDto: UpdateChildLocationDto, currentUser: any): Promise<Child> {
    const child = await this.childModel.findById(id);
    if (!child) {
      throw new NotFoundException('Child not found');
    }

    if (currentUser.role !== UserRole.ADMIN) {
      if (currentUser.type === 'child') {
        if (currentUser.id !== id) {
          throw new ForbiddenException('You can only update your own location');
        }
      } else {
        const isParent = child.parent.toString() === currentUser.id;
        const isLinkedParent = child.linkedParents.some(p => p.toString() === currentUser.id);

        if (!isParent && !isLinkedParent) {
          throw new ForbiddenException('You can only update your own children');
        }
      }
    }

    child.location = {
      lat: updateChildLocationDto.lat,
      lng: updateChildLocationDto.lng,
      updatedAt: new Date(),
    } as any;

    await child.save({ validateModifiedOnly: true });

    const updatedChild = await this.childModel.findById(id).populate('parent', '-password').populate('linkedParents', '-password').exec();
    if (!updatedChild) {
      throw new NotFoundException('Child not found after updating location');
    }

    // Check danger zones and send notifications (async, don't block response)
    this.checkDangerZonesAndNotify(updatedChild).catch(error => {
      console.error('Error checking danger zones:', error);
    });

    return updatedChild;
  }

  /**
   * Check if child has entered/exited any danger zones and send notifications
   */
  private async checkDangerZonesAndNotify(child: Child): Promise<void> {
    try {
      const events = await this.dangerZoneService.checkDangerZones(child);

      // Send notifications for each event
      for (const event of events) {
        const dangerZone = await this.dangerZoneService.findOne(
          event.dangerZone.toString(),
          { role: UserRole.ADMIN, id: 'system' }
        );

        // Get all parent IDs (main parent + linked parents)
        const parentIds = [
          child.parent.toString(),
          ...child.linkedParents.map(p => p.toString())
        ];

        // Send notification to all parents
        for (const parentId of parentIds) {
          try {
            await this.notificationService.sendDangerZoneAlert(parentId, {
              child,
              dangerZone,
              eventType: event.type,
              location: event.location,
            });

            // Mark notification as sent
            await this.dangerZoneService.markNotificationSent((event as any)._id.toString());
          } catch (error) {
            console.error(`Failed to send notification to parent ${parentId}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error in danger zone check:', error);
    }
  }

  /**
   * Link parent to child by QR code
   */
  async linkParentByQr(qrCode: string, currentUser: any): Promise<any> {
    // Find child by QR code
    const child = await this.childModel.findOne({ qrCode }).exec();
    
    if (!child) {
      throw new NotFoundException('Child with this QR code not found');
    }

    // Check if user is trying to link to their own child as main parent
    if (child.parent.toString() === currentUser.id) {
      throw new ForbiddenException('You are already the main parent of this child');
    }

    // Check if already linked
    const alreadyLinked = child.linkedParents.some(p => p.toString() === currentUser.id);
    if (alreadyLinked) {
      throw new ForbiddenException('You are already linked to this child');
    }

    // Verify current user is a PARENT
    const parent = await this.userModel.findById(currentUser.id);
    if (!parent || parent.role !== UserRole.PARENT) {
      throw new ForbiddenException('Only parents can link to children');
    }

    // Add parent to linkedParents array
    child.linkedParents.push(new Types.ObjectId(currentUser.id));
    await child.save();

    // Create room for parent-child pair
    try {
      await this.roomModel.create({
        parent: new Types.ObjectId(currentUser.id),
        child: child._id,
        isActive: true,
      });
    } catch (error: any) {
      // Ignore if room already exists
      if (error.code !== 11000) {
        console.error('Error creating room for linked parent:', error.message);
      }
    }

    // Return updated child with populated fields
    const updatedChild = await this.childModel
      .findById(child._id)
      .populate('parent', '-password')
      .populate('linkedParents', '-password')
      .exec();

    return {
      message: 'Successfully linked to child',
      child: updatedChild,
    };
  }

  /**
   * Unlink current user from child
   */
  async unlinkParent(childId: string, currentUser: any): Promise<any> {
    const child = await this.childModel.findById(childId);
    
    if (!child) {
      throw new NotFoundException('Child not found');
    }

    // Cannot unlink main parent
    if (child.parent.toString() === currentUser.id) {
      throw new ForbiddenException('Cannot unlink main parent. Only linked parents can be removed.');
    }

    // Check if user is actually linked
    const isLinked = child.linkedParents.some(p => p.toString() === currentUser.id);
    if (!isLinked) {
      throw new ForbiddenException('You are not linked to this child');
    }

    // Remove user from linkedParents
    child.linkedParents = child.linkedParents.filter(p => p.toString() !== currentUser.id);
    await child.save();

    // Optionally deactivate the room
    try {
      await this.roomModel.updateOne(
        { parent: new Types.ObjectId(currentUser.id), child: child._id },
        { isActive: false }
      );
    } catch (error) {
      console.error('Error deactivating room:', error);
    }

    return {
      message: 'Successfully unlinked from child',
    };
  }

  /**
   * Unlink specific parent from child (by main parent or admin)
   */
  async unlinkSpecificParent(childId: string, parentId: string, currentUser: any): Promise<any> {
    const child = await this.childModel.findById(childId);
    
    if (!child) {
      throw new NotFoundException('Child not found');
    }

    // Only main parent or admin can unlink other parents
    if (currentUser.role !== UserRole.ADMIN && child.parent.toString() !== currentUser.id) {
      throw new ForbiddenException('Only the main parent or admin can unlink other parents');
    }

    // Cannot unlink main parent
    if (child.parent.toString() === parentId) {
      throw new ForbiddenException('Cannot unlink main parent');
    }

    // Check if parent is actually linked
    const isLinked = child.linkedParents.some(p => p.toString() === parentId);
    if (!isLinked) {
      throw new NotFoundException('This parent is not linked to the child');
    }

    // Remove parent from linkedParents
    child.linkedParents = child.linkedParents.filter(p => p.toString() !== parentId);
    await child.save();

    // Optionally deactivate the room
    try {
      await this.roomModel.updateOne(
        { parent: new Types.ObjectId(parentId), child: child._id },
        { isActive: false }
      );
    } catch (error) {
      console.error('Error deactivating room:', error);
    }

    return {
      message: 'Successfully unlinked parent from child',
    };
  }
}
