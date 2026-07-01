import { Store, StoreTagSource } from '../entities';

export const storeTagAssociations = () => {
  Store.belongsToMany(StoreTagSource, {
    through: 'store_tags',
    foreignKey: 'store_id',
    otherKey: 'tag_id',
    as: 'tags',
    timestamps: false,
  });
};
