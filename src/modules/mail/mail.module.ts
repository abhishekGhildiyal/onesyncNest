import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from 'src/db/database.module';
import { MailService } from './mail.service';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
