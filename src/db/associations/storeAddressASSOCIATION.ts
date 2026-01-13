import { Store, StoreLocationMapping } from '../entities';

export const storeAddressAssociations = () => {
  Store.hasMany(StoreLocationMapping, {
    foreignKey: 'store_id',
    as: 'address',
  });
};
