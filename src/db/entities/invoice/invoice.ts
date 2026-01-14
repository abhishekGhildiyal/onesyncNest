import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  timestamps: true,
})
export class Invoice extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
  })
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

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  total_amount: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  received_amount: number;

  @Column({
    type: DataType.STRING(4000),
    allowNull: true,
  })
  pdf_URL: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  invoiceItems: any;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  created_by: string;
}
