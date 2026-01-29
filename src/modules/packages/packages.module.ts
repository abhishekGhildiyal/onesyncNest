import { Global, Module } from '@nestjs/common';
import { HelpersModule } from 'src/common/helpers/helpers.module';
import { DatabaseModule } from 'src/db/database.module';
import { SocketModule } from '../socket/socket.module';
import { PackagesController } from './packages.controller';
import { PackagesService } from './packages.service';

@Global()
@Module({
  imports: [DatabaseModule, SocketModule, HelpersModule],
  providers: [PackagesService],
  controllers: [PackagesController],
  exports: [PackagesService],
})
export class PackagesModule {}
