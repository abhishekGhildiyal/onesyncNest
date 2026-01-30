import { ConsumerInventory, ConsumerProductList, ConsumerProductVariants } from '../entities';

export const consumerInventoryAssociations = () => {
  // Product → Variants
  ConsumerProductList.hasMany(ConsumerProductVariants, {
    foreignKey: 'product_id',
    as: 'variants',
  });
  ConsumerProductVariants.belongsTo(ConsumerProductList, {
    foreignKey: 'product_id',
    as: 'product',
  });

  // Inventory → Product
  ConsumerInventory.belongsTo(ConsumerProductList, {
    foreignKey: 'product_id',
    as: 'product',
  });
  ConsumerProductList.hasMany(ConsumerInventory, {
    foreignKey: 'product_id',
    as: 'inventoryItems',
  });
};
