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
export class PriceChangeRequest extends Model {
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
  declare storeId: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'user_id',
  })
  declare userId: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'product_name',
  })
  declare productName: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'item_id',
  })
  declare itemId: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare sku: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare size: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare owner: string;

  @Column({
    type: DataType.DOUBLE,
    allowNull: false,
    field: 'old_price',
  })
  declare oldPrice: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: false,
    field: 'new_price',
  })
  declare newPrice: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: false,
    field: 'price_adjustment',
  })
  declare priceAdjustment: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare status: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare webBarcode: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    field: 'requested_time',
  })
  declare requestedTime: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: 'status_update_time',
  })
  declare statusUpdateTime: Date;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'updating_user',
  })
  declare updatingUser: string;
}
