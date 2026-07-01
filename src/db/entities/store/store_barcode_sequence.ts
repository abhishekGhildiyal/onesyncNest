import { Column, DataType, Model, PrimaryKey, Table } from 'sequelize-typescript';

@Table({
  tableName: 'store_barcode_sequence',
  timestamps: false,
})
export class StoreBarcodeSequence extends Model {
  @PrimaryKey
  @Column({ type: DataType.INTEGER, field: 'store_id' })
  declare store_id: number;

  @Column({ type: DataType.INTEGER, field: 'sequence_value' })
  declare sequence_value: number;
}
