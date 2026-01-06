import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { BrandsController } from './brands.controller';
import { BrandsService } from './brands.service';
import { Brand } from '../products/entities/brand.entity';
import { ProductList } from '../products/entities/product-list.entity';
import { Variant } from '../products/entities/variant.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../users/entities/role.entity';
import { UserStoreMapping } from '../users/entities/user-store-mapping.entity';
import { Store } from '../users/entities/store.entity';
import { AccessPackageOrder } from '../products/entities/access-package-order.entity';
import { AccessPackageBrand } from '../products/entities/access-package-brand.entity';
import { AccessPackageBrandItems } from '../products/entities/access-package-brand-items.entity';
import { AccessPackageBrandItemsQty } from '../products/entities/access-package-brand-item-qty.entity';
import { AccessPackageBrandItemsCapacity } from '../products/entities/access-package-brand-item-capacity.entity';
import { AccessPackageCustomer } from '../products/entities/access-package-customer.entity';
import { PackageCustomer } from '../packages/entities/package-customer.entity';
import { PackageOrder } from '../packages/entities/package-order.entity';
import { MailModule } from '../mail/mail.module';
import { SocketModule } from '../socket/socket.module';
import { OnboardingModule } from '../onboarding/onboarding.module';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Brand,
      ProductList,
      Variant,
      User,
      Role,
      UserStoreMapping,
      Store,
      AccessPackageOrder,
      AccessPackageBrand,
      AccessPackageBrandItems,
      AccessPackageBrandItemsQty,
      AccessPackageBrandItemsCapacity,
      AccessPackageCustomer,
      PackageCustomer,
      PackageOrder,
    ]),
    MailModule,
    SocketModule,
    OnboardingModule,
  ],
  controllers: [BrandsController],
  providers: [BrandsService],
  exports: [BrandsService],
})
export class BrandsModule {}
