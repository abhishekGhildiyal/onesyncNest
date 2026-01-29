import { forwardRef, Module } from '@nestjs/common';
import { HelpersModule } from 'src/common/helpers/helpers.module';
import { DatabaseModule } from 'src/db/database.module';
import { ShopifyController } from './shopify.controller';
import { ShopifyServiceFactory } from './shopify.service';

@Module({
  imports: [DatabaseModule, forwardRef(() => HelpersModule)],
  controllers: [ShopifyController],
  providers: [ShopifyServiceFactory],
  exports: [ShopifyServiceFactory],
})
export class ShopifyModule {}
