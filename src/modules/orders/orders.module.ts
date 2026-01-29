import { Module } from '@nestjs/common';
import { HelpersModule } from 'src/common/helpers/helpers.module';
import { DatabaseModule } from 'src/db/database.module';
import { ShopifyModule } from '../shopify/shopify.module';
import { SocketModule } from '../socket/socket.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [ShopifyModule, DatabaseModule, SocketModule, HelpersModule],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
