import {
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'role_permission',
  timestamps: false,
})
export class RolePermission extends Model<RolePermission> {
  @PrimaryKey
  @Column({
    type: DataType.INTEGER,
    field: 'role_id',
    allowNull: false,
  })
  roleId: number;

  @PrimaryKey
  @Column({
    type: DataType.BIGINT,
    field: 'permission_id',
    allowNull: false,
  })
  permissionId: number;
}
