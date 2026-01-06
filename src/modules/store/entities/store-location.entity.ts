import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Store } from '../../users/entities';

@Table({
  tableName: 'store_location_mapping',
  timestamps: false,
})
export class StoreLocation extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @ForeignKey(() => Store)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  store_id: number;

  @BelongsTo(() => Store)
  store: Store;

  @Column(DataType.BOOLEAN)
  active: boolean;

  @Column(DataType.STRING)
  address1: string;

  @Column(DataType.STRING)
  address2: string;

  @Column(DataType.STRING)
  admin_graphql_api_id: string;

  @Column(DataType.STRING)
  city: string;

  @Column(DataType.STRING)
  country: string;

  @Column(DataType.STRING)
  country_code: string;

  @Column(DataType.BOOLEAN)
  default_store_location: boolean;

  @Column(DataType.BOOLEAN)
  legacy: boolean;

  @Column(DataType.STRING)
  localized_country_name: string;

  @Column(DataType.STRING)
  localized_province_name: string;

  @Column(DataType.STRING)
  name: string;

  @Column(DataType.STRING)
  phone: string;

  @Column(DataType.STRING)
  province: string;

  @Column(DataType.STRING)
  province_code: string;

  @Column(DataType.STRING)
  shopify_location_id: string;

  @Column(DataType.STRING)
  timezone: string;

  @Column(DataType.INTEGER)
  zip: number;
}
