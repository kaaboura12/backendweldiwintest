import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule, InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User, UserSchema } from './schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule implements OnModuleInit {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async onModuleInit() {
    try {
      await this.connection.collection('users').dropIndex('googleId_1');
      console.log('✅ Dropped obsolete googleId_1 index from users collection');
    } catch (error: any) {
      if (error.code !== 27 && error.codeName !== 'IndexNotFound') {
        console.error('Error dropping users googleId index:', error.message || error);
      }
    }
  }
}
