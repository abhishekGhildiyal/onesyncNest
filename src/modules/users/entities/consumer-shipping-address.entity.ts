import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './user.entity';

@Table({
  tableName: 'ConsumerShippingAddress', // Keeping same as legacy define name if applicable, or check DB
  timestamps: true,
})
export class ConsumerShippingAddress extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @Column(DataType.STRING)
  label: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    field: 'consumer_id',
    allowNull: false,
  })
  consumerId: number;

  @BelongsTo(() => User)
  consumer: User;

  @Column({
    type: DataType.STRING,
    field: 'user_address',
  })
  address: string;

  @Column({
    type: DataType.STRING,
    field: 'user_address2',
  })
  address2: string;

  @Column(DataType.STRING)
  country: string;

  @Column(DataType.STRING)
  city: string;

  @Column(DataType.STRING)
  state: string;

  @Column(DataType.STRING)
  zip: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  selected: boolean;

  @Column({
    type: DataType.BOOLEAN,
    field: 'same_address',
    allowNull: false,
    defaultValue: false,
  })
  sameAddress: boolean;
}
