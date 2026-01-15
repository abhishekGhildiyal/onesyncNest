import {
  AutoIncrement,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { User } from '../user/user';

@Table({
  tableName: 'authenticate',
  timestamps: true,
})
export class Authenticate extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
  })
  declare id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare userName: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare password: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare token: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare storeId: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    field: 'user_id',
  })
  declare userId: number;

  @BelongsTo(() => User)
  declare user: User;
}
