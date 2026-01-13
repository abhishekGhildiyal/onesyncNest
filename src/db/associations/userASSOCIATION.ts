import { Role, Store, User, UserStoreMapping } from '../entities';

export const userAssociations = () => {
  // Setup associations here
  User.hasMany(UserStoreMapping, {
    foreignKey: 'userId',
    as: 'mappings',
  });

  UserStoreMapping.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  UserStoreMapping.belongsTo(Role, {
    foreignKey: 'roleId',
    as: 'role',
  });

  UserStoreMapping.belongsTo(Store, {
    foreignKey: 'storeId',
    as: 'store',
  });
};
