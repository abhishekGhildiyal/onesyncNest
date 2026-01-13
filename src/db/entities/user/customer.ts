import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
  Unique,
} from 'sequelize-typescript';

@Table({
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
})
export class Customers extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
    field: 'customer_id',
  })
  declare id: number;

  @Column({
    type: DataType.STRING,
    field: 'first_name',
  })
  first_name: string;

  @Column({
    type: DataType.STRING,
    field: 'last_name',
  })
  last_name: string;

  @Unique
  @Column({
    type: DataType.STRING,
    field: 'phone_number',
  })
  phone_number: string;

  @Unique
  @Column({
    type: DataType.STRING,
  })
  email: string;

  @Column({
    type: DataType.STRING,
    field: 'user_secret_key',
  })
  password: string;
}
