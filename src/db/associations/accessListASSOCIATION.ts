import {
  AccessPackageBrand,
  AccessPackageBrandItems,
  AccessPackageBrandItemsCapacity,
  AccessPackageBrandItemsQty,
  AccessPackageCustomer,
  AccessPackageOrder,
  Brands,
  ProductList,
  Store,
  User,
  Variant,
} from '../entities';

export const accessListAssociations = () => {
  // Capacity -> BrandItem
  AccessPackageBrandItemsCapacity.belongsTo(AccessPackageBrandItems, {
    foreignKey: 'item_id',
    as: 'item',
  });

  // Capacity -> Variant
  AccessPackageBrandItemsCapacity.belongsTo(Variant, {
    foreignKey: 'variant_id',
    as: 'variant',
  });

  // Qty -> BrandItem
  AccessPackageBrandItemsQty.belongsTo(AccessPackageBrandItems, {
    foreignKey: 'item_id',
    as: 'qtyItem',
  });

  // BrandItem -> Capacities
  AccessPackageBrandItems.hasMany(AccessPackageBrandItemsCapacity, {
    foreignKey: 'item_id',
    as: 'capacities',
    onDelete: 'CASCADE',
    hooks: true,
  });

  // BrandItem -> Quantities
  AccessPackageBrandItems.hasMany(AccessPackageBrandItemsQty, {
    foreignKey: 'item_id',
    as: 'sizeQuantities',
    onDelete: 'CASCADE',
    hooks: true,
  });

  // BrandItem -> Product
  AccessPackageBrandItems.belongsTo(ProductList, {
    foreignKey: 'product_id',
    as: 'products',
  });

  // Brand -> BrandItems
  AccessPackageBrand.hasMany(AccessPackageBrandItems, {
    foreignKey: 'packageBrand_id',
    as: 'items',
    onDelete: 'CASCADE',
    hooks: true,
  });

  AccessPackageBrandItems.belongsTo(AccessPackageBrand, {
    foreignKey: 'packageBrand_id',
    as: 'brand',
  });

  // Brand -> Order
  AccessPackageBrand.belongsTo(AccessPackageOrder, {
    foreignKey: 'package_id',
    as: 'order',
  });

  // PackageBrand -> Brand
  AccessPackageBrand.belongsTo(Brands, {
    foreignKey: 'brand_id',
    as: 'brandData',
  });

  // Customer -> Order
  AccessPackageCustomer.belongsTo(AccessPackageOrder, {
    foreignKey: 'package_id',
    as: 'order',
  });

  // Order -> Brands
  AccessPackageOrder.hasMany(AccessPackageBrand, {
    foreignKey: 'package_id',
    as: 'brands',
    onDelete: 'CASCADE',
    hooks: true,
  });

  // Order -> Customers
  AccessPackageOrder.hasMany(AccessPackageCustomer, {
    foreignKey: 'package_id',
    as: 'customers',
    onDelete: 'CASCADE',
    hooks: true,
  });

  // Order -> Store
  AccessPackageOrder.belongsTo(Store, {
    foreignKey: 'store_id',
    as: 'store',
  });

  // Order -> User
  AccessPackageOrder.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
  });

  // Customer -> User
  AccessPackageCustomer.belongsTo(User, {
    foreignKey: 'customer_id',
    as: 'customers',
  });

  // User -> packageCustomers
  User.hasMany(AccessPackageCustomer, {
    foreignKey: 'customer_id',
    as: 'packageCustomer',
  });
};
