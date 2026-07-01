import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/db/database.module';
import { MailModule } from '../mail/mail.module';
import { SocketModule } from '../socket/socket.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [DatabaseModule, MailModule, SocketModule],
  providers: [ProductsService],
  controllers: [ProductsController],
  exports: [ProductsService],
})
export class ProductsModule {}
