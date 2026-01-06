import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'users',
  timestamps: false,
  freezeTableName: true,
})
export class User extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
    field: 'user_id',
  })
  declare userId: number;

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

  @Column({
    type: DataType.STRING,
    unique: true,
    field: 'phone_number',
  })
  declare phnNo: string;

  @Column({
    type: DataType.STRING,
    unique: true,
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

  @Column(DataType.STRING)
  declare country: string;

  @Column(DataType.STRING)
  declare city: string;

  @Column(DataType.STRING)
  declare state: string;

  @Column(DataType.STRING)
  declare zip: string;
}
