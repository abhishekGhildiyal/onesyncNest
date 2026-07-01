import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'payment_form',
  timestamps: false,
})
export class PaymentForm extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT)
  declare id: number;

  @Column({ type: DataType.STRING, field: 'payment_form' })
  declare paymentForm: string;

  @Column({ type: DataType.INTEGER, field: 'store_id' })
  declare storeId: number;
}
