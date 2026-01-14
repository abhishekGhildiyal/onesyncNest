import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from 'src/db/database.module';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [StoreService],
  controllers: [StoreController],
  exports: [StoreService],
})
export class StoreModule {}
