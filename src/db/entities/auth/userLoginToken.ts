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
export class UserLoginToken extends Model {
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
  declare userId: number;

  @Column({
    type: DataType.INTEGER,
    field: 'store_id',
  })
  declare storeId: number;

  @Column({
    type: DataType.INTEGER,
    field: 'status',
  })
  declare status: number;

  @Column({
    type: DataType.STRING,
    field: 'expire_time',
  })
  declare expireTime: string;

  @Column({
    type: DataType.STRING,
    field: 'creation_time',
  })
  declare createTime: string;

  @Column({
    type: DataType.STRING,
    field: 'primary_token',
  })
  declare token: string;

  @Column({
    type: DataType.VIRTUAL,
  })
  declare role: string;

  @Column({
    type: DataType.VIRTUAL,
  })
  declare feePercentage: number;
}
