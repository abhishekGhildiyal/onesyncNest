//  s/product/package/packageAssociations.js

import {
  Brands,
  PackageBrand,
  PackageBrandItems,
  PackageBrandItemsCapacity,
  PackageBrandItemsQty,
  PackageCustomer,
  PackageOrder,
  PackagePayment,
  PackageShipment,
  ProductList,
  Store,
  TagSource,
  User,
  Variant,
} from '../entities';

export const packageAssociations = () => {
  // Capacity -> Product
  PackageBrandItemsCapacity.belongsTo(PackageBrandItems, {
    foreignKey: 'item_id',
    as: 'item',
  });

  PackageBrandItemsCapacity.belongsTo(Variant, {
    foreignKey: 'variant_id',
    as: 'variant',
  });

  // Qty -> Product
  PackageBrandItemsQty.belongsTo(PackageBrandItems, {
    foreignKey: 'item_id',
    as: 'qtyItem',
  });

  // BrandItem -> Capacity
  PackageBrandItems.hasMany(PackageBrandItemsCapacity, {
    foreignKey: 'item_id',
    as: 'capacities',
    onDelete: 'CASCADE',
    hooks: true,
  });

  // BrandItem -> Qty
  PackageBrandItems.hasMany(PackageBrandItemsQty, {
    foreignKey: 'item_id',
    as: 'sizeQuantities',
    onDelete: 'CASCADE',
    hooks: true,
  });

  // BrandItem -> Product
  PackageBrandItems.belongsTo(ProductList, {
    foreignKey: 'product_id',
    as: 'products',
  });

  // Brand -> BrandItems
  PackageBrand.hasMany(PackageBrandItems, {
    foreignKey: 'packageBrand_id',
    as: 'items',
    onDelete: 'CASCADE',
    hooks: true,
  });

  PackageBrandItems.belongsTo(PackageBrand, {
    foreignKey: 'packageBrand_id',
    as: 'brand',
  });

  // Brand -> Order
  PackageBrand.belongsTo(PackageOrder, {
    foreignKey: 'package_id',
    as: 'order',
  });

  // PackageBrand -> Brand
  PackageBrand.belongsTo(Brands, {
    foreignKey: 'brand_id',
    as: 'brandData',
  });

  // Customer -> Order
  PackageCustomer.belongsTo(PackageOrder, {
    foreignKey: 'package_id',
    as: 'order',
  });

  // Customer -> User
  PackageCustomer.belongsTo(User, {
    foreignKey: 'customer_id',
    as: 'customer',
  });

  // User -> packageCustomers
  User.hasMany(PackageCustomer, {
    foreignKey: 'customer_id',
    as: 'packageCustomers',
  });

  // Order -> Brands
  PackageOrder.hasMany(PackageBrand, {
    foreignKey: 'package_id',
    as: 'brands',
    onDelete: 'CASCADE',
    hooks: true,
  });

  PackageOrder.belongsTo(Store, {
    foreignKey: 'store_id',
    as: 'store',
  });

  // Order -> Customers
  PackageOrder.hasMany(PackageCustomer, {
    foreignKey: 'package_id',
    as: 'customers',
    onDelete: 'CASCADE',
    hooks: true,
  });

  // user -> Package
  PackageOrder.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
  });

  // Order -> shipment
  PackageOrder.hasMany(PackageShipment, {
    foreignKey: 'package_id',
    as: 'shipment',
  });

  // Shipment -> Order
  PackageShipment.belongsTo(PackageOrder, {
    foreignKey: 'package_id',
    as: 'order',
  });

  // Order -> payment
  PackageOrder.hasMany(PackagePayment, {
    foreignKey: 'package_id',
    as: 'payment',
  });

  // payment -> Order
  PackagePayment.belongsTo(PackageOrder, {
    foreignKey: 'package_id',
    as: 'order',
  });

  // Employee -> User
  PackageOrder.belongsTo(User, {
    foreignKey: 'employee_id',
    as: 'employee',
  });

  // salesAgent -> User
  PackageOrder.belongsTo(User, {
    foreignKey: 'sales_agent_id',
    as: 'salesAgent',
  });

  /**
|--------------------------------------------------
| ✅ Many-to-Many association with TagSource ---------
|--------------------------------------------------
*/
  ProductList.belongsToMany(TagSource, {
    through: 'product_tags',
    foreignKey: 'product_id',
    otherKey: 'tag_id',
    as: 'tags',
  });

  ProductList.belongsTo(Brands, {
    foreignKey: 'brand_id',
    as: 'brandData',
  });

  ProductList.hasMany(Variant, {
    foreignKey: 'productId',
    as: 'variants',
  });
};
