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
export class PayoutRecord extends Model {
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
  declare customvariantId: string;

  @Column({
    type: DataType.STRING,
    field: 'recipient_name',
  })
  declare recipientName: string;

  @Column({
    type: DataType.STRING,
    field: 'recipient_email',
  })
  declare recipientEmail: string;

  @Column({
    type: DataType.BOOLEAN,
    field: 'success',
  })
  declare success: boolean;

  @Column({
    type: DataType.STRING,
    field: 'message',
  })
  declare message: string;

  @Column({
    type: DataType.STRING,
    field: 'item_name',
  })
  declare itemName: string;

  @Column({
    type: DataType.INTEGER,
    field: 'user_id',
  })
  declare userId: number;

  @Column({
    type: DataType.STRING,
    field: 'status',
  })
  declare status: string;

  @Column({
    type: DataType.INTEGER,
    field: 'product_id',
  })
  declare productId: number;

  @Column({
    type: DataType.DOUBLE,
    field: 'amount',
  })
  declare amount: number;

  @Column({
    type: DataType.BIGINT,
    field: 'item_id',
  })
  declare itemId: number;

  @Column({
    type: DataType.DATE,
    field: 'payout_date',
  })
  declare payoutDate: Date;
}
