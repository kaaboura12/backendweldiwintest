import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../user/schemas/user.schema';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<UserRole[]>('roles', context.getHandler());
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    // Must have authenticated user
    if (!user) {
      return false;
    }

    // If no specific roles are required, allow any authenticated user (user or child)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Children cannot access routes that require user roles
    if (user.type === 'child') {
      return false;
    }

    // Allow ADMIN to access all routes with roles
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Check if user has one of the required roles
    return requiredRoles.includes(user.role);
  }
}

