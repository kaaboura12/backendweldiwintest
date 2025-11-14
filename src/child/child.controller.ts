import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ChildService } from './child.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { UpdateChildLocationDto } from './dto/update-child-location.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { UserRole } from '../user/schemas/user.schema';

@ApiTags('Children')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('children')
export class ChildController {
  constructor(private readonly childService: ChildService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PARENT)
  @ApiOperation({ summary: 'Create a new child (ADMIN and PARENT only - PARENT creates for themselves, ADMIN can create for any parent)' })
  @ApiResponse({ status: 201, description: 'Child successfully created' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only PARENT or ADMIN can create children' })
  create(@Body() createChildDto: CreateChildDto, @CurrentUser() currentUser: any) {
    return this.childService.create(createChildDto, currentUser);
  }

  @Get()
  @ApiOperation({ summary: 'Get all children (ADMIN sees all, PARENT sees only their own)' })
  @ApiResponse({ status: 200, description: 'List of children' })
  findAll(@CurrentUser() currentUser: any) {
    return this.childService.findAll(currentUser);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current child profile (for children only)' })
  @ApiResponse({ status: 200, description: 'Child profile' })
  @ApiResponse({ status: 403, description: 'Forbidden - This endpoint is only for children' })
  getProfile(@CurrentUser() currentUser: any) {
    return this.childService.getProfile(currentUser);
  }

  @Get('parent/:parentId')
  @ApiOperation({ summary: 'Get children by parent ID (ADMIN can see any, PARENT only their own)' })
  @ApiParam({ name: 'parentId', description: 'Parent User ID' })
  @ApiResponse({ status: 200, description: 'List of children for the parent' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot view these children' })
  getChildrenByParent(@Param('parentId') parentId: string, @CurrentUser() currentUser: any) {
    return this.childService.getChildrenByParent(parentId, currentUser);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get child by ID (ADMIN can access any, PARENT only their own, CHILD only themselves)' })
  @ApiParam({ name: 'id', description: 'Child ID' })
  @ApiResponse({ status: 200, description: 'Child details' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot access this child' })
  @ApiResponse({ status: 404, description: 'Child not found' })
  findOne(@Param('id') id: string, @CurrentUser() currentUser: any) {
    return this.childService.findOne(id, currentUser);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update child (ADMIN can update any, PARENT only their own, CHILD only themselves)' })
  @ApiParam({ name: 'id', description: 'Child ID' })
  @ApiResponse({ status: 200, description: 'Child successfully updated' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot update this child' })
  @ApiResponse({ status: 404, description: 'Child not found' })
  update(
    @Param('id') id: string,
    @Body() updateChildDto: UpdateChildDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.childService.update(id, updateChildDto, currentUser);
  }

  @Patch(':id/location')
  @ApiOperation({ summary: 'Update child location (ADMIN, PARENT for their child, or CHILD themselves)' })
  @ApiParam({ name: 'id', description: 'Child ID' })
  @ApiResponse({ status: 200, description: 'Child location updated' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot update this child location' })
  @ApiResponse({ status: 404, description: 'Child not found' })
  updateLocation(
    @Param('id') id: string,
    @Body() updateChildLocationDto: UpdateChildLocationDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.childService.updateLocation(id, updateChildLocationDto, currentUser);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete child (ADMIN can delete any, PARENT can delete their own)' })
  @ApiParam({ name: 'id', description: 'Child ID' })
  @ApiResponse({ status: 200, description: 'Child successfully deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot delete this child' })
  @ApiResponse({ status: 404, description: 'Child not found' })
  remove(@Param('id') id: string, @CurrentUser() currentUser: any) {
    return this.childService.remove(id, currentUser);
  }
}
