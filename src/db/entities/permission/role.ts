import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'roles',
  timestamps: false,
})
export class Role extends Model<Role> {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
    field: 'role_id',
  })
  roleId: number;

  @Column({
    type: DataType.STRING,
    field: 'role_name',
  })
  roleName: string;

  @Column({
    type: DataType.INTEGER,
    field: 'role_status',
  })
  status: number;

  @Column({
    type: DataType.STRING,
    field: 'feature_id',
  })
  featureId: string;

  @Column({
    type: DataType.INTEGER,
    field: 'store_id',
  })
  storeId: number;
}
