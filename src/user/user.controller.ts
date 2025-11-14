import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { UserRole } from './schemas/user.schema';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new user (ADMIN only)' })
  @ApiResponse({ status: 201, description: 'User successfully created' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only ADMIN can create users' })
  @ApiResponse({ status: 409, description: 'User with this email already exists' })
  create(@Body() createUserDto: CreateUserDto, @CurrentUser() currentUser: any) {
    if (currentUser.type === 'child') {
      throw new ForbiddenException('This endpoint is only for users, not children');
    }
    return this.userService.create(createUserDto, currentUser);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile (for users only, not children)' })
  @ApiResponse({ status: 200, description: 'User profile' })
  @ApiResponse({ status: 403, description: 'Forbidden - Children cannot access user endpoints' })
  getProfile(@CurrentUser() currentUser: any) {
    if (currentUser.type === 'child') {
      throw new ForbiddenException('This endpoint is only for users, not children');
    }
    return this.userService.getProfile(currentUser);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users (ADMIN sees all, PARENT sees only themselves)' })
  @ApiResponse({ status: 200, description: 'List of users' })
  @ApiResponse({ status: 403, description: 'Forbidden - Children cannot access user endpoints' })
  findAll(@CurrentUser() currentUser: any) {
    if (currentUser.type === 'child') {
      throw new ForbiddenException('This endpoint is only for users, not children');
    }
    return this.userService.findAll(currentUser);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID (ADMIN can access any, PARENT only their own)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot access this user' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string, @CurrentUser() currentUser: any) {
    if (currentUser.type === 'child') {
      throw new ForbiddenException('This endpoint is only for users, not children');
    }
    return this.userService.findOne(id, currentUser);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user (ADMIN can update any, PARENT only their own)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User successfully updated' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot update this user' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: any,
  ) {
    if (currentUser.type === 'child') {
      throw new ForbiddenException('This endpoint is only for users, not children');
    }
    return this.userService.update(id, updateUserDto, currentUser);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete user (ADMIN only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User successfully deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only ADMIN can delete users' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(@Param('id') id: string, @CurrentUser() currentUser: any) {
    if (currentUser.type === 'child') {
      throw new ForbiddenException('This endpoint is only for users, not children');
    }
    return this.userService.remove(id, currentUser);
  }
}
