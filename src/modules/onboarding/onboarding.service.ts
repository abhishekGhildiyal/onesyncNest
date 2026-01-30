import { BadRequestException, Injectable } from '@nestjs/common';
import { UserRepository } from 'src/db/repository/user.repository';

@Injectable()
export class OnboardingService {
  constructor(private userrepo: UserRepository) {}

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
    throw new BadRequestException({
      message: 'Reset password logic requires UserTokenModel which is missing in legacy source.',
      success: false,
    });
  }
}
