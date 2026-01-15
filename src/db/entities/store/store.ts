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
export class Store extends Model {
  @PrimaryKey
  @AutoIncrement
  @Index({ unique: true, name: 'store_id_unique' })
  @Column({
    type: DataType.INTEGER,
  })
  declare store_id: number;

  @Column({
    type: DataType.STRING,
  })
  declare store_name: string;

  @Column({
    type: DataType.INTEGER,
  })
  declare priority_type: number;

  @Column({
    type: DataType.STRING,
  })
  declare store_domain: string;

  @Column({
    type: DataType.STRING,
  })
  declare store_code: string;

  @Column({
    type: DataType.STRING,
  })
  declare store_icon: string;

  @Column({
    type: DataType.STRING,
  })
  declare shopify_store: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  declare is_discount: boolean;

  @Column({
    type: DataType.DOUBLE,
    allowNull: false,
    defaultValue: 10,
  })
  declare fee_percentage: number;

  @Column({
    type: DataType.STRING,
  })
  declare shopify_token: string;

  @Column({
    type: DataType.STRING,
  })
  declare web_hook_token: string;

  @Column({
    type: DataType.STRING,
  })
  declare location_id: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  declare is_web_store: boolean;

  @Column({
    type: DataType.STRING,
  })
  declare check_book_api_key: string;

  @Column({
    type: DataType.STRING,
  })
  declare sequence_name: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  declare is_goat_app_installed: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  declare is_stadium_goods: boolean;

  @Column({
    type: DataType.STRING,
  })
  declare web_store_domain: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare sendgridApiKey: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare sendgridFromEmail: string;

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
