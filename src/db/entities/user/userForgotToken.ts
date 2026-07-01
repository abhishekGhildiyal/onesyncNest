import {
  AutoIncrement,
  Column,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  Unique,
} from 'sequelize-typescript';
import { User } from './user';

@Table({
  tableName: 'user_forgot_tokens',
  timestamps: true,
})
export class UserForgotToken extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @Unique
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare token: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'user_id',
  })
  declare user_id: number;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    field: 'expires_at',
  })
  declare expires_at: Date;
}
