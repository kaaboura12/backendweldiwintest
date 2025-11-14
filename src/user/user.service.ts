import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument, UserRole } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(createUserDto: CreateUserDto, currentUser: any): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userModel.findOne({ email: createUserDto.email });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Only ADMIN can create users
    if (currentUser.type !== 'user' || currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only ADMIN can create users');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
    });

    return user.save();
  }

  async findAll(currentUser: any): Promise<User[]> {
    // ADMIN can see all users, PARENT can only see themselves
    if (currentUser.role === UserRole.ADMIN) {
      return this.userModel.find().select('-password').exec();
    } else if (currentUser.role === UserRole.PARENT) {
      // PARENT can only see themselves
      return this.userModel.find({ _id: currentUser.id }).select('-password').exec();
    } else {
      // This shouldn't happen due to controller guards, but just in case
      return [];
    }
  }

  async findOne(id: string, currentUser: any): Promise<User> {
    // ADMIN can see any user, PARENT can only see themselves
    if (currentUser.role !== UserRole.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('You can only access your own profile');
    }

    const user = await this.userModel.findById(id).select('-password').exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto, currentUser: any): Promise<User> {
    // ADMIN can update any user, PARENT can only update themselves
    if (currentUser.role !== UserRole.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }

    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if email is being changed and if it's already taken
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userModel.findOne({ email: updateUserDto.email });
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
    }

    // Hash password if provided
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    // PARENT cannot change their role
    if (currentUser.role !== UserRole.ADMIN && updateUserDto.role) {
      delete updateUserDto.role;
    }

    // Use findByIdAndUpdate for partial updates - doesn't validate unmodified required fields
    const updatedUser = await this.userModel.findByIdAndUpdate(
      id,
      { $set: updateUserDto },
      { new: true, runValidators: true }
    ).select('-password').exec();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }

  async remove(id: string, currentUser: any): Promise<void> {
    // Only ADMIN can delete users
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only ADMIN can delete users');
    }

    // Prevent admin from deleting themselves
    if (currentUser.id === id) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    const user = await this.userModel.findByIdAndDelete(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
  }

  async getProfile(currentUser: any): Promise<User> {
    const user = await this.userModel.findById(currentUser.id).select('-password').exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
