import {
  AutoIncrement,
  Column,
  DataType,
  Index,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'stores',
  timestamps: false,
})
export class Store extends Model<Store> {
  @PrimaryKey
  @AutoIncrement
  @Index({ unique: true, name: 'store_id_unique' })
  @Column({
    type: DataType.INTEGER,
  })
  store_id: number;

  @Column({
    type: DataType.STRING,
  })
  store_name: string;

  @Column({
    type: DataType.INTEGER,
  })
  priority_type: number;

  @Column({
    type: DataType.STRING,
  })
  store_domain: string;

  @Column({
    type: DataType.STRING,
  })
  store_code: string;

  @Column({
    type: DataType.STRING,
  })
  store_icon: string;

  @Column({
    type: DataType.STRING,
  })
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

  @Column({
    type: DataType.STRING,
  })
  shopify_token: string;

  @Column({
    type: DataType.STRING,
  })
  web_hook_token: string;

  @Column({
    type: DataType.STRING,
  })
  location_id: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  is_web_store: boolean;

  @Column({
    type: DataType.STRING,
  })
  check_book_api_key: string;

  @Column({
    type: DataType.STRING,
  })
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

  @Column({
    type: DataType.STRING,
  })
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

  // Hide sensitive fields in JSON responses
  toJSON(): Omit<
    this,
    | 'shopify_token'
    | 'web_hook_token'
    | 'location_id'
    | 'check_book_api_key'
    | 'is_goat_app_installed'
    | 'is_stadium_goods'
  > {
    const store = { ...this.get() };

    // Use type assertion to avoid TypeScript errors
    const storeObj = store as any;

    // Remove sensitive fields from JSON output
    delete storeObj.shopify_token;
    delete storeObj.web_hook_token;
    delete storeObj.location_id;
    delete storeObj.check_book_api_key;
    delete storeObj.is_goat_app_installed;
    delete storeObj.is_stadium_goods;

    return storeObj;
  }
}
