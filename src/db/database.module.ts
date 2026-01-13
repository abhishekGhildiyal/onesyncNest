import { Module, OnModuleInit } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { initAssociations } from './associations';
import { ENTITIES } from './entities';
import { DATABASE_WHAREHOUSE } from './repository';

@Module({
  imports: [SequelizeModule.forFeature(ENTITIES)],
  providers: [...DATABASE_WHAREHOUSE],
  exports: [...DATABASE_WHAREHOUSE],
})
export class DatabaseModule implements OnModuleInit {
  onModuleInit() {
    initAssociations();
  }
}
