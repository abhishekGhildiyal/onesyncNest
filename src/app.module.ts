import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HelpersModule } from './common/helpers/helpers.module';
import { DatabaseModule } from './db/database.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { MailModule } from './modules/mail/mail.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PackagesModule } from './modules/packages/packages.module';
import { ProductsModule } from './modules/products/products.module';
import { ShopifyModule } from './modules/shopify/shopify.module';
import { SocketModule } from './modules/socket/socket.module';
import { StoreModule } from './modules/store/store.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        dialect: 'mysql',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT', 3306),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        autoLoadModels: true,
        synchronize: false,
        logging: false,
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        },
      }),
    }),
    DatabaseModule, // all entities and associations are loaded here

    HelpersModule,
    MailModule,
    InventoryModule,
    ShopifyModule,
    SocketModule,
    OnboardingModule,
    ProductsModule,
    OrdersModule,
    StoreModule,
    UsersModule,
    PackagesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
