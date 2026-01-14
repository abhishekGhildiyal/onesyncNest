import { Global, Module } from '@nestjs/common';
import { ConsumerInventoryHelperService } from 'src/common/helpers/consumerInventory';
import { DatabaseModule } from 'src/db/database.module';
import { PackagesController } from './packages.controller';
import { PackagesService } from './packages.service';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [PackagesService, ConsumerInventoryHelperService],
  controllers: [PackagesController],
  exports: [PackagesService],
})
export class PackagesModule {}
