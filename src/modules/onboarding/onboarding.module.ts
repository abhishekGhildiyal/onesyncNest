import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UserLoginToken } from './entities/user-login-token.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../users/entities/role.entity';
import { UserStoreMapping } from '../users/entities/user-store-mapping.entity';
import { Permission } from '../users/entities/permission.entity';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';


@Module({
  imports: [
    SequelizeModule.forFeature([
      UserLoginToken,
      User,
      Role,
      UserStoreMapping,
      Permission,
    ]),
  ],
  providers: [OnboardingService],
  controllers: [OnboardingController],
  exports: [OnboardingService],
})
export class OnboardingModule {}
