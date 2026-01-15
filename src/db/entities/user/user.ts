import {
  AutoIncrement,
  Column,
  DataType,
  HasMany,
  Model,
  PrimaryKey,
  Table,
  Unique,
} from 'sequelize-typescript';
import { Authenticate } from '../auth/authenticateSchema';
import { PackageCustomer } from '../consumerOrders/package/packageCustomers';
import { UserStoreMapping } from './userStoreMapping';

@Table({
  tableName: 'users',
  freezeTableName: true,
  timestamps: false,
})
export class User extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
    field: 'user_id',
  })
  declare id: number;

  @Column({
    type: DataType.STRING,
    field: 'first_name',
  })
  declare firstName: string;

  @Column({
    type: DataType.STRING,
    field: 'last_name',
  })
  declare lastName: string;

  @Column({
    type: DataType.STRING,
    field: 'business_name',
  })
  declare businessName: string;

  @Column({
    type: DataType.INTEGER,
    field: 'issue_payment_to',
  })
  declare issuePaymentTo: number;

  @Column({
    type: DataType.INTEGER,
    field: 'user_type',
  })
  declare type: number;

  @Unique
  @Column({
    type: DataType.STRING,
    field: 'phone_number',
  })
  declare phnNo: string;

  @Unique
  @Column({
    type: DataType.STRING,
  })
  declare email: string;

  @Column({
    type: DataType.STRING,
    field: 'user_secret_key',
  })
  declare password: string;

  @Column({
    type: DataType.STRING,
    field: 'user_address',
  })
  declare address: string;

  @Column({
    type: DataType.STRING,
    field: 'user_address2',
  })
  declare address2: string;

  @Column({
    type: DataType.STRING,
  })
  declare country: string;

  @Column({
    type: DataType.STRING,
  })
  declare city: string;

  @Column({
    type: DataType.STRING,
  })
  declare state: string;

  @Column({
    type: DataType.STRING,
  })
  declare zip: string;

  // Transient field (not in database)
  // Use class property or getter for transient fields
  declare storeList?: any[];

  // Relationships
  @HasMany(() => Authenticate)
  declare authentications: Authenticate[];

  // Association properties (defined in packageASSOCIATION.ts)
  declare packageCustomers: PackageCustomer[];

  // Associations from userASSOCIATION.ts
  declare mappings: UserStoreMapping[];
}
