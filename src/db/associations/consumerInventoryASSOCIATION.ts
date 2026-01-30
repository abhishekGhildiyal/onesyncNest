import { ConsumerProductList, ConsumerProductVariants, CustomerInventory } from '../entities';

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
  CustomerInventory.belongsTo(ConsumerProductList, {
    foreignKey: 'product_id',
    as: 'product',
  });
  ConsumerProductList.hasMany(CustomerInventory, {
    foreignKey: 'product_id',
    as: 'inventoryItems',
  });
};
