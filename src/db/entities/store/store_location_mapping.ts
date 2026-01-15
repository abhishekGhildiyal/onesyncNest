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
export class StoreLocationMapping extends Model {
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
  declare store_id: number;

  @Column({
    type: DataType.BOOLEAN,
  })
  declare active: boolean;

  @Column({
    type: DataType.STRING,
  })
  declare address1: string;

  @Column({
    type: DataType.STRING,
  })
  declare address2: string;

  @Column({
    type: DataType.STRING,
  })
  declare admin_graphql_api_id: string;

  @Column({
    type: DataType.STRING,
  })
  declare city: string;

  @Column({
    type: DataType.STRING,
  })
  declare country: string;

  @Column({
    type: DataType.STRING,
  })
  declare country_code: string;

  @Column({
    type: DataType.BOOLEAN,
  })
  declare default_store_location: boolean;

  @Column({
    type: DataType.BOOLEAN,
  })
  declare legacy: boolean;

  @Column({
    type: DataType.STRING,
  })
  declare localized_country_name: string;

  @Column({
    type: DataType.STRING,
  })
  declare localized_province_name: string;

  @Column({
    type: DataType.STRING,
  })
  declare name: string;

  @Column({
    type: DataType.STRING,
  })
  declare phone: string;

  @Column({
    type: DataType.STRING,
  })
  declare province: string;

  @Column({
    type: DataType.STRING,
  })
  declare province_code: string;

  @Column({
    type: DataType.STRING,
  })
  declare shopify_location_id: string;

  @Column({
    type: DataType.STRING,
  })
  declare timezone: string;

  @Column({
    type: DataType.INTEGER,
  })
  declare zip: number;
}
