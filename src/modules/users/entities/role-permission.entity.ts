import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Permission } from './permission.entity';
import { Role } from './role.entity';

@Table({
  tableName: 'role_permission',
  timestamps: false,
})
export class RolePermission extends Model {
  @ForeignKey(() => Role)
  @Column(DataType.INTEGER)
  declare role_id: number;

  @ForeignKey(() => Permission)
  @Column(DataType.INTEGER)
  declare permission_id: number;
}
