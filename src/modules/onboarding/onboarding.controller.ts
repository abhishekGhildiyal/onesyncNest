import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OnboardingService } from './onboarding.service';

@ApiTags('Onboarding')
@Controller('onboarding')
 // Changed route prefix to onboarding as well? User asked to "change auth folder name to onboarding". Usually implies route too, or maybe keeps 'auth'. Let's keep 'auth' if API endpoint shouldn't change, OR change to 'onboarding'.
// "move guards in seprate ... auth is only for onboarding api or make onboarding module different and shift api there"
// "change auth folder name to onboarding"
// I will keep the controller route as 'auth' for now to avoid breaking clients, UNLESS 'onboarding' is desired. 
// "shift api there" implies moving it. 
// I'll stick to 'auth' for the route path to be safe unless user specified API path change. But class name changes.
// actually, let's use 'auth' path to minimize breakage.
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('isTokenValid/:token')
  verifyResetToken(@Param('token') token: string) {
    return this.onboardingService.verifyResetToken(token);
  }

  @Post('resetPassword')
  resetPassword(@Body() body: any) {
    return this.onboardingService.resetPassword(body);
  }
}
