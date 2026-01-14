import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/db/database.module';
import { MailModule } from '../mail/mail.module';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { SocketModule } from '../socket/socket.module';
import { BrandsController } from './brands.controller';
import { BrandsService } from './brands.service';

@Module({
  imports: [MailModule, SocketModule, OnboardingModule, DatabaseModule],
  controllers: [BrandsController],
  providers: [BrandsService],
  exports: [BrandsService],
})
export class BrandsModule {}
