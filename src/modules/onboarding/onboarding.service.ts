import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from '../users/entities/user.entity';
import { AllMessages } from '../../common/constants/messages';
import { hashPasswordMD5 } from '../../common/helpers/hash.helper';

@Injectable()
export class OnboardingService {
  constructor(
    @InjectModel(User) private userModel: typeof User,
  ) {}

  // Porting from onboarding/controller.js
  // Note: legacy code used UserTokenModel which isn't defined in the SQL models found so far.
  // This might be for a different part of the system or incomplete in legacy.
  // Porting as is but adapted for Sequelize User model if needed.

  async verifyResetToken(token: string) {
    // Logic from legacy for verifyResetToken would go here
    // Based on legacy, it checks UserTokenModel which is missing.
    return { message: '' };
  }

  async resetPassword(body: any) {
    const { token, password } = body;
    // Implementation would depend on UserTokenModel
    throw new BadRequestException('Reset password logic requires UserTokenModel which is missing in legacy source.');
  }
}
