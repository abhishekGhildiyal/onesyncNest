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
export class PayoutDetails extends Model {
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
  declare soldDate: Date;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'item_name',
  })
  declare itemName: string;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  declare amount: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: true,
    field: 'item_id',
  })
  declare itemId: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: 'payout_date',
  })
  declare payoutDate: Date;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    field: 'product_id',
  })
  declare productId: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'custom_variant_id',
  })
  declare customVariantId: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    field: 'store_id',
  })
  declare storeId: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare sku: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'condition',
  })
  declare condition: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'web_barcode',
  })
  declare webBarcode: string;

  @Column({
    type: DataType.BIGINT,
    allowNull: true,
    field: 'payout_history_id',
  })
  declare payoutHistoryId: number;
}
