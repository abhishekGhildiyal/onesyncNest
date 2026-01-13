import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'shopify_order_request',
  timestamps: false,
})
export class ShopifyOrderRequest extends Model<ShopifyOrderRequest> {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
    field: 'id',
  })
  declare id: number;

  @Column({
    type: DataType.STRING,
    field: 'shopify_event_id',
  })
  shopifyEventId: string;
}
