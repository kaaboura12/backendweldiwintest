import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'WeldiWin Backend API is running! 🚀';
  }
}
