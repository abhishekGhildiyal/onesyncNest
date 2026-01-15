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
export class PayoutHistory extends Model {
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
  declare userName: string;

  @Column({
    type: DataType.INTEGER,
    field: 'user_id',
  })
  declare userId: number;

  @Column({
    type: DataType.DOUBLE,
    field: 'amount',
  })
  declare amount: number;

  @Column({
    type: DataType.INTEGER,
    field: 'items',
  })
  declare items: number;

  @Column({
    type: DataType.STRING,
    field: 'method',
  })
  declare Method: string;

  @Column({
    type: DataType.DATE,
    field: 'payout_date',
  })
  declare payoutDate: Date;

  @Column({
    type: DataType.STRING,
    field: 'email',
  })
  declare email: string;

  @Column({
    type: DataType.STRING,
    field: 'memo',
  })
  declare memo: string;

  @Column({
    type: DataType.INTEGER,
    field: 'store_id',
  })
  declare storeId: number;

  @Column({
    type: DataType.STRING,
    field: 'sku',
  })
  declare sku: string;

  @Column({
    type: DataType.STRING,
    field: 'condition',
  })
  declare condition: string; // handle SQL reserved keyword

  @Column({
    type: DataType.STRING,
    field: 'web_barcode',
  })
  declare webBarcode: string;
}
