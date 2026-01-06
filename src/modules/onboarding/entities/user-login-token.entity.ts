import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from '../../users/entities/user.entity';

@Table({
  tableName: 'user_login_token',
  timestamps: false,
})
export class UserLoginToken extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    field: 'user_id',
  })
  userId: number;

  @BelongsTo(() => User)
  user: User;

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

  @Column(DataType.VIRTUAL)
  role: string;

  @Column(DataType.VIRTUAL)
  feePercentage: number;
}
