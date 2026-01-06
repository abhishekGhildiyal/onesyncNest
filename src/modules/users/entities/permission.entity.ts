import {
  AutoIncrement,
  BelongsToMany,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { RolePermission } from './role-permission.entity';
import { Role } from './role.entity';

@Table({
  tableName: 'permissions',
  timestamps: false,
})
export class Permission extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @Column({
    type: DataType.STRING,
    unique: true,
    allowNull: false,
  })
  declare name: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_super_admin_permission',
  })
  declare isSuperAdminPermission: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_consumer_permission',
  })
  declare isConsumerPermission: boolean;

  @BelongsToMany(() => Role, () => RolePermission)
  declare roles: Role[];
}
