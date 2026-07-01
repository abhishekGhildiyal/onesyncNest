import { Permission, Role } from '../entities';

export const rolePermissionAssociations = () => {
  Role.belongsToMany(Permission, {
    through: 'role_permission',
    foreignKey: 'role_id',
    otherKey: 'permission_id',
    as: 'permissions',
    timestamps: false,
  });

  Permission.belongsToMany(Role, {
    through: 'role_permission',
    foreignKey: 'permission_id',
    otherKey: 'role_id',
    as: 'roles',
    timestamps: false,
  });
};
