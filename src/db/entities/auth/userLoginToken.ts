import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'user_login_token',
  timestamps: false,
})
export class UserLoginToken extends Model<UserLoginToken> {
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
    field: 'status',
  })
  status: number;

  @Column({
    type: DataType.STRING,
    field: 'expire_time',
  })
  expireTime: string;

  @Column({
    type: DataType.STRING,
    field: 'creation_time',
  })
  createTime: string;

  @Column({
    type: DataType.STRING,
    field: 'primary_token',
  })
  token: string;

  @Column({
    type: DataType.VIRTUAL,
  })
  role: string;

  @Column({
    type: DataType.VIRTUAL,
  })
  feePercentage: number;
}
