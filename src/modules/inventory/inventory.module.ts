import { Module } from '@nestjs/common';
import { HelpersModule } from 'src/common/helpers/helpers.module';
import { DatabaseModule } from 'src/db/database.module';
import { ShopifyModule } from 'src/modules/shopify/shopify.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  imports: [DatabaseModule, HelpersModule, ShopifyModule],
  providers: [InventoryService],
  controllers: [InventoryController],
  exports: [InventoryService],
})
export class InventoryModule {}
