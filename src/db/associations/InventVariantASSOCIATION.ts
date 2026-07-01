// Associations for Inventory and Variants

import { Inventory, ProductList, User, Variant } from '../entities';

export const inventVariantAssociations = () => {
  // Inventory → Variant (1 : many)
  Inventory.hasMany(Variant, {
    foreignKey: 'item_id', // FK in Variant table
    sourceKey: 'id', // PK in Inventory (item_id)
    as: 'variants',
  });

  // Variant → Inventory (many : 1)
  Variant.belongsTo(Inventory, {
    foreignKey: 'item_id', // FK in Variant table
    targetKey: 'id', // PK in Inventory
    as: 'inventory',
  });

  Inventory.belongsTo(ProductList, {
    foreignKey: 'product_id',
    as: 'productList',
  });

  ProductList.hasMany(Inventory, {
    foreignKey: 'product_id',
    as: 'inventories', // productList.inventories
  });

  Inventory.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
  });

  User.hasMany(Inventory, {
    foreignKey: 'user_id',
    as: 'inventories', // user.inventories
  });

  Variant.belongsTo(ProductList, {
    foreignKey: 'productId',
    as: 'product',
  });

  ProductList.hasMany(Variant, {
    foreignKey: 'product_id',
    as: 'productVariants', // productList.productVariants
  });

  Variant.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
  });

  User.hasMany(Variant, {
    foreignKey: 'user_id',
    as: 'variants', // user.variants
  });
};
