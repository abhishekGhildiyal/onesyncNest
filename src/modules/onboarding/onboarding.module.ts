import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/db/database.module';
import { MailModule } from '../mail/mail.module';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

@Module({
  imports: [DatabaseModule, MailModule],
  providers: [OnboardingService],
  controllers: [OnboardingController],
  exports: [OnboardingService],
})
export class OnboardingModule {}
