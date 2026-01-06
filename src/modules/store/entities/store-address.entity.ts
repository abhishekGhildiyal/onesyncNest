import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Store } from '../../users/entities';

@Table({
  tableName: 'storeAddress',
  timestamps: true,
})
export class StoreAddress extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @Column(DataType.STRING)
  label: string;

  @ForeignKey(() => Store)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'store_id',
  })
  storeId: number;

  @BelongsTo(() => Store)
  store: Store;

  @Column(DataType.BOOLEAN)
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

  @Column(DataType.STRING)
  city: string;

  @Column(DataType.STRING)
  country: string;

  @Column(DataType.STRING)
  state: string;

  @Column(DataType.STRING)
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
