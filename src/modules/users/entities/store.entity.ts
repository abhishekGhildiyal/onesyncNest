import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement } from 'sequelize-typescript';

@Table({
  tableName: 'stores',
  timestamps: false,
})
export class Store extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  store_id: number;

  @Column(DataType.STRING)
  store_name: string;

  @Column(DataType.INTEGER)
  priority_type: number;

  @Column(DataType.STRING)
  store_domain: string;

  @Column(DataType.STRING)
  store_code: string;

  @Column(DataType.STRING)
  store_icon: string;

  @Column(DataType.STRING)
  shopify_store: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  is_discount: boolean;

  @Column({
    type: DataType.DOUBLE,
    allowNull: false,
    defaultValue: 10,
  })
  fee_percentage: number;

  @Column(DataType.STRING)
  shopify_token: string;

  @Column(DataType.STRING)
  web_hook_token: string;

  @Column(DataType.STRING)
  location_id: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  is_web_store: boolean;

  @Column(DataType.STRING)
  check_book_api_key: string;

  @Column(DataType.STRING)
  sequence_name: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  is_goat_app_installed: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  is_stadium_goods: boolean;

  @Column(DataType.STRING)
  web_store_domain: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  sendgridApiKey: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  sendgridFromEmail: string;

  toJSON() {
    const store = super.toJSON();
    delete store.shopify_token; // updated from camelCase if needed, matching toJSON legacy
    delete store.web_hook_token;
    delete store.location_id;
    delete store.check_book_api_key;
    delete store.is_goat_app_installed;
    delete store.is_stadium_goods;
    return store;
  }
}
