import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  timestamps: true,
})
export class StoreAddress extends Model<StoreAddress> {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
  })
  declare id: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  label: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'store_id',
  })
  storeId: number;

  @Column({
    type: DataType.BOOLEAN,
  })
  selected: boolean;

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

  @Column({
    type: DataType.STRING,
  })
  city: string;

  @Column({
    type: DataType.STRING,
  })
  country: string;

  @Column({
    type: DataType.STRING,
  })
  state: string;

  @Column({
    type: DataType.STRING,
  })
  zip: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  isBilling: boolean;

  @Column({
    type: DataType.BOOLEAN,
    field: 'same_address',
    allowNull: false,
    defaultValue: false,
  })
  sameAddress: boolean;
}
