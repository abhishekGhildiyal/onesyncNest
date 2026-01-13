import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'price_change_request',
  timestamps: false,
})
export class PriceChangeRequest extends Model<PriceChangeRequest> {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.BIGINT.UNSIGNED,
  })
  declare id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'store_id',
  })
  storeId: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'user_id',
  })
  userId: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'product_name',
  })
  productName: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'item_id',
  })
  itemId: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  sku: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  size: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  owner: string;

  @Column({
    type: DataType.DOUBLE,
    allowNull: false,
    field: 'old_price',
  })
  oldPrice: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: false,
    field: 'new_price',
  })
  newPrice: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: false,
    field: 'price_adjustment',
  })
  priceAdjustment: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  status: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  webBarcode: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    field: 'requested_time',
  })
  requestedTime: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: 'status_update_time',
  })
  statusUpdateTime: Date;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'updating_user',
  })
  updatingUser: string;
}
