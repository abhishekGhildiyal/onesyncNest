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
export class RolePermission extends Model {
  @PrimaryKey
  @Column({
    type: DataType.INTEGER,
    field: 'role_id',
    allowNull: false,
  })
  declare roleId: number;

  @PrimaryKey
  @Column({
    type: DataType.BIGINT,
    field: 'permission_id',
    allowNull: false,
  })
  declare permissionId: number;
}
