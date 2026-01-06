import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement } from 'sequelize-typescript';

@Table({
  tableName: 'invoice',
  timestamps: true,
})
export class Invoice extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  invoice_number: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  consumer_id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  store_id: number;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  invoice_date: Date;

  @Column(DataType.DOUBLE)
  total_amount: number;

  @Column(DataType.DOUBLE)
  received_amount: number;

  @Column(DataType.STRING(4000))
  pdf_URL: string;

  @Column(DataType.JSON)
  invoiceItems: any;

  @Column(DataType.STRING)
  created_by: string;
}
