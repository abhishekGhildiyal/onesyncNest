import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'payout_history',
  timestamps: false,
})
export class PayoutHistory extends Model<PayoutHistory> {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.BIGINT,
    field: 'id',
  })
  declare id: number;

  @Column({
    type: DataType.STRING,
    field: 'user_name',
  })
  userName: string;

  @Column({
    type: DataType.INTEGER,
    field: 'user_id',
  })
  userId: number;

  @Column({
    type: DataType.DOUBLE,
    field: 'amount',
  })
  amount: number;

  @Column({
    type: DataType.INTEGER,
    field: 'items',
  })
  items: number;

  @Column({
    type: DataType.STRING,
    field: 'method',
  })
  Method: string;

  @Column({
    type: DataType.DATE,
    field: 'payout_date',
  })
  payoutDate: Date;

  @Column({
    type: DataType.STRING,
    field: 'email',
  })
  email: string;

  @Column({
    type: DataType.STRING,
    field: 'memo',
  })
  memo: string;

  @Column({
    type: DataType.INTEGER,
    field: 'store_id',
  })
  storeId: number;

  @Column({
    type: DataType.STRING,
    field: 'sku',
  })
  sku: string;

  @Column({
    type: DataType.STRING,
    field: 'condition',
  })
  condition: string; // handle SQL reserved keyword

  @Column({
    type: DataType.STRING,
    field: 'web_barcode',
  })
  webBarcode: string;
}
