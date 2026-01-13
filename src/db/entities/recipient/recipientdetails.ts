import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({
  tableName: 'recipient_details',
  timestamps: false,
})
export class RecipientDetails extends Model<RecipientDetails> {
  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  recipientName: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  recipientEmail: string;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  amount: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  variantId: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  userId: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  status: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  itemName: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  productId: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: true,
  })
  itemId: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  soldDate: Date;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  memo: string;
}
