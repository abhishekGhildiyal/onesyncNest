import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'payout_record',
  timestamps: false,
})
export class PayoutRecord extends Model<PayoutRecord> {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.BIGINT,
    field: 'id',
  })
  declare id: number;

  @Column({
    type: DataType.STRING,
    field: 'customvariant_id',
  })
  customvariantId: string;

  @Column({
    type: DataType.STRING,
    field: 'recipient_name',
  })
  recipientName: string;

  @Column({
    type: DataType.STRING,
    field: 'recipient_email',
  })
  recipientEmail: string;

  @Column({
    type: DataType.BOOLEAN,
    field: 'success',
  })
  success: boolean;

  @Column({
    type: DataType.STRING,
    field: 'message',
  })
  message: string;

  @Column({
    type: DataType.STRING,
    field: 'item_name',
  })
  itemName: string;

  @Column({
    type: DataType.INTEGER,
    field: 'user_id',
  })
  userId: number;

  @Column({
    type: DataType.STRING,
    field: 'status',
  })
  status: string;

  @Column({
    type: DataType.INTEGER,
    field: 'product_id',
  })
  productId: number;

  @Column({
    type: DataType.DOUBLE,
    field: 'amount',
  })
  amount: number;

  @Column({
    type: DataType.BIGINT,
    field: 'item_id',
  })
  itemId: number;

  @Column({
    type: DataType.DATE,
    field: 'payout_date',
  })
  payoutDate: Date;
}
