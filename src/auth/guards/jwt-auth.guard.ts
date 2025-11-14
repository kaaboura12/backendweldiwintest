import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Add your custom authentication logic here
    // For example, call super.logIn(request) to establish a session.
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    // You can throw an exception based on "info" or "err" arguments
    if (err) {
      // Log the actual error for debugging
      console.error('JWT Auth Error:', err.message || err);
      throw err;
    }
    if (!user) {
      // Log info about why user is missing
      console.error('JWT Auth Info:', info?.message || info);
      throw new UnauthorizedException(
        info?.message || 'Authentication required. Please provide a valid token. Make sure you are logged in and the token is sent in the Authorization header as: Bearer <token>'
      );
    }
    return user;
  }
}

