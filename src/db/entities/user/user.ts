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

@Table({
  tableName: 'users',
  freezeTableName: true,
  timestamps: false,
})
export class User extends Model<User> {
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
  firstName: string;

  @Column({
    type: DataType.STRING,
    field: 'last_name',
  })
  lastName: string;

  @Column({
    type: DataType.STRING,
    field: 'business_name',
  })
  businessName: string;

  @Column({
    type: DataType.INTEGER,
    field: 'issue_payment_to',
  })
  issuePaymentTo: number;

  @Column({
    type: DataType.INTEGER,
    field: 'user_type',
  })
  type: number;

  @Unique
  @Column({
    type: DataType.STRING,
    field: 'phone_number',
  })
  phnNo: string;

  @Unique
  @Column({
    type: DataType.STRING,
  })
  email: string;

  @Column({
    type: DataType.STRING,
    field: 'user_secret_key',
  })
  password: string;

  @Column({
    type: DataType.STRING,
    field: 'user_address',
  })
  address: string;

  @Column({
    type: DataType.STRING,
    field: 'user_address2',
  })
  address2: string;

  @Column({
    type: DataType.STRING,
  })
  country: string;

  @Column({
    type: DataType.STRING,
  })
  city: string;

  @Column({
    type: DataType.STRING,
  })
  state: string;

  @Column({
    type: DataType.STRING,
  })
  zip: string;

  // Transient field (not in database)
  // Use class property or getter for transient fields
  storeList?: any[];

  // Relationships
  @HasMany(() => Authenticate)
  authentications: Authenticate[];
}
