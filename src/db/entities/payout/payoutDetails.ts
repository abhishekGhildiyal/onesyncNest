import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'payout_details',
  timestamps: false,
})
export class PayoutDetails extends Model<PayoutDetails> {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.BIGINT,
  })
  declare id: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: 'sold_date',
  })
  soldDate: Date;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'item_name',
  })
  itemName: string;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  amount: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: true,
    field: 'item_id',
  })
  itemId: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: 'payout_date',
  })
  payoutDate: Date;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    field: 'product_id',
  })
  productId: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'custom_variant_id',
  })
  customVariantId: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    field: 'store_id',
  })
  storeId: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  sku: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'condition',
  })
  condition: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'web_barcode',
  })
  webBarcode: string;

  @Column({
    type: DataType.BIGINT,
    allowNull: true,
    field: 'payout_history_id',
  })
  payoutHistoryId: number;
}
