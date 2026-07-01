import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'channel',
  timestamps: false,
})
export class Channel extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
    field: 'channel_id',
  })
  declare id: number;

  @Column({ type: DataType.STRING, field: 'channel_name' })
  declare channelName: string;

  @Column({ type: DataType.INTEGER, field: 'store_id' })
  declare storeId: number;

  @Column({ type: DataType.STRING, field: 'marketplace_id' })
  declare marketPlaceId: string;

  @Column({ type: DataType.BOOLEAN, field: 'is_shopify_channel', defaultValue: false })
  declare isShopifyChannel: boolean;

  @Column({ type: DataType.BOOLEAN, field: 'is_dynamic', defaultValue: false })
  declare isDynamic: boolean;

  @Column({ type: DataType.STRING, field: 'display_name' })
  declare displayName: string;

  @Column({ type: DataType.STRING, field: 'channel_sold_source' })
  declare channelSoldSource: string;
}
