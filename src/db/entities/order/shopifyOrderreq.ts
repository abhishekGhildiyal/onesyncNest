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
  tableName: 'shopify_order_request',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
})
export class ShopifyOrderRequest extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.BIGINT,
    field: 'id',
  })
  declare id: number;

  @Unique
  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'shopify_event_id',
  })
  declare shopifyEventId: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare topic: string;

  @Column({
    type: DataType.BIGINT,
    allowNull: true,
    field: 'shopify_order_id',
  })
  declare shopifyOrderId: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare status: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare payload: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    field: 'store_id',
  })
  declare storeId: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: 'processed_at',
  })
  declare processedAt: Date;
}
