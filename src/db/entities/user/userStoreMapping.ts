import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'user_store_role',
  timestamps: false,
})
export class UserStoreMapping extends Model<UserStoreMapping> {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
    field: 'id',
  })
  declare id: number;

  @Column({
    type: DataType.INTEGER,
    field: 'user_id',
  })
  userId: number;

  @Column({
    type: DataType.INTEGER,
    field: 'store_id',
  })
  storeId: number;

  @Column({
    type: DataType.INTEGER,
    field: 'role_id',
  })
  roleId: number;

  @Column({
    type: DataType.INTEGER,
    field: 'role_status',
  })
  status: number;

  @Column({
    type: DataType.FLOAT,
    field: 'user_fee',
  })
  fee: number;

  @Column({
    type: DataType.STRING,
    field: 'user_time_zone',
  })
  userTimeZone: string;

  @Column({
    type: DataType.BIGINT,
  })
  favourite_store_location_id: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  })
  is_sales_agent: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  })
  is_logistic_agent: boolean;
}
