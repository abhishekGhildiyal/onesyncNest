import { ConsumerProductList, ConsumerProductVariants, CustomerInventory } from '../entities';

export const consumerInventoryAssociations = () => {
  // Product → Variants
  ConsumerProductList.hasMany(ConsumerProductVariants, {
    foreignKey: 'productId',
    as: 'variants',
  });
  ConsumerProductVariants.belongsTo(ConsumerProductList, {
    foreignKey: 'productId',
    as: 'product',
  });

  // Inventory → Product
  CustomerInventory.belongsTo(ConsumerProductList, {
    foreignKey: 'productId',
    as: 'product',
  });
  ConsumerProductList.hasMany(CustomerInventory, {
    foreignKey: 'productId',
    as: 'inventoryItems',
  });
};
