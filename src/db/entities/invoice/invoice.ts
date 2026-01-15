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
  declare invoice_number: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare consumer_id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare store_id: number;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  declare invoice_date: Date;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  declare total_amount: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  declare received_amount: number;

  @Column({
    type: DataType.STRING(4000),
    allowNull: true,
  })
  declare pdf_URL: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  declare invoiceItems: any;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare created_by: string;
}
