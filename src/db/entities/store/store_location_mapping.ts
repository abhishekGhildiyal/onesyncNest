import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'store_location_mapping',
  timestamps: false,
})
export class StoreLocationMapping extends Model<StoreLocationMapping> {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
  })
  declare id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  store_id: number;

  @Column({
    type: DataType.BOOLEAN,
  })
  active: boolean;

  @Column({
    type: DataType.STRING,
  })
  address1: string;

  @Column({
    type: DataType.STRING,
  })
  address2: string;

  @Column({
    type: DataType.STRING,
  })
  admin_graphql_api_id: string;

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
  country_code: string;

  @Column({
    type: DataType.BOOLEAN,
  })
  default_store_location: boolean;

  @Column({
    type: DataType.BOOLEAN,
  })
  legacy: boolean;

  @Column({
    type: DataType.STRING,
  })
  localized_country_name: string;

  @Column({
    type: DataType.STRING,
  })
  localized_province_name: string;

  @Column({
    type: DataType.STRING,
  })
  name: string;

  @Column({
    type: DataType.STRING,
  })
  phone: string;

  @Column({
    type: DataType.STRING,
  })
  province: string;

  @Column({
    type: DataType.STRING,
  })
  province_code: string;

  @Column({
    type: DataType.STRING,
  })
  shopify_location_id: string;

  @Column({
    type: DataType.STRING,
  })
  timezone: string;

  @Column({
    type: DataType.INTEGER,
  })
  zip: number;
}
