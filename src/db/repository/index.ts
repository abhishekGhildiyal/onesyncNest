import { OrderRepository } from './order.repository';
import { PackageRepository } from './package.repository';
import { ProductRepository } from './product.repository';
import { StoreRepository } from './store.repository';
import { UserRepository } from './user.repository';

export const DATABASE_WHAREHOUSE = [
  OrderRepository,
  PackageRepository,
  ProductRepository,
  StoreRepository,
  UserRepository,
];
