import { Module, Global } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { StoreAddress, StoreLocation, Invoice, Label, PrintTemplate } from './entities';
import { StoreService } from './store.service';
import { StoreController } from './store.controller';
import { Store } from '../users/entities';

@Global()
@Module({
  imports: [
    SequelizeModule.forFeature([
      Store,
      StoreAddress,
      StoreLocation,
      Invoice,
      Label,
      PrintTemplate,
    ]),
  ],
  providers: [StoreService],
  controllers: [StoreController],
  exports: [StoreService],
})
export class StoreModule {}
