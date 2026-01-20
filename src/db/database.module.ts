import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection, SequelizeModule } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';

import { initAssociations } from './associations';
import { ENTITIES } from './entities';
import { DATABASE_WHAREHOUSE } from './repository';

@Module({
  imports: [SequelizeModule.forFeature(ENTITIES)],
  providers: [...DATABASE_WHAREHOUSE],
  exports: [...DATABASE_WHAREHOUSE],
})
export class DatabaseModule implements OnModuleInit {
  private readonly logger = new Logger(DatabaseModule.name);
  constructor(
    @InjectConnection()
    private readonly sequelize: Sequelize,

    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    initAssociations();

    const dbName = this.configService.get<string>('DB_NAME');

    try {
      await this.sequelize.authenticate();
      this.logger.log(`🏋️  Database connected successfully: 👉 ${dbName} 🏋️`);
    } catch (error) {
      console.log(`❌ Database connection failed: ${dbName}`, error);
    }
  }
}
