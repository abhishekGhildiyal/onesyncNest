import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OnboardingService } from './onboarding.service';

@ApiTags('Onboarding')
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('forgotPassword')
  forgotPassword(@Body() body: { email: string }) {
    return this.onboardingService.forgotPassword(body);
  }

  @Get('isTokenValid/:token')
  verifyResetToken(@Param('token') token: string) {
    return this.onboardingService.verifyResetToken(token);
  }

  @Post('resetPassword')
  resetPassword(@Body() body: { token: string; password: string }) {
    return this.onboardingService.resetPassword(body);
  }
}
