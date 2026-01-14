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
export class Role extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
    field: 'role_id',
  })
  declare roleId: number;

  @Column({
    type: DataType.STRING,
    field: 'role_name',
  })
  declare roleName: string;

  @Column({
    type: DataType.INTEGER,
    field: 'role_status',
  })
  declare status: number;

  @Column({
    type: DataType.STRING,
    field: 'feature_id',
  })
  declare featureId: string;

  @Column({
    type: DataType.INTEGER,
    field: 'store_id',
  })
  declare storeId: number;
}
