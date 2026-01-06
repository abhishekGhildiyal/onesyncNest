import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Label } from './label.entity';
import { Store } from '../../users/entities';

@Table({
  tableName: 'template',
  timestamps: false,
})
export class PrintTemplate extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @Column(DataType.STRING)
  name: string;

  @Column(DataType.STRING)
  category: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    field: 'show_location_on_barcode',
  })
  showLocationOnBarcode: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    field: 'show_price_on_barcode',
  })
  showPriceOnBarcode: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    field: 'charge_tax',
  })
  chargeTax: boolean;

  @Column({
    type: DataType.DOUBLE,
    field: 'tax_threshold',
  })
  taxThreshold: number;

  @Column(DataType.DOUBLE)
  weight: number;

  @ForeignKey(() => Store)
  @Column({
    type: DataType.INTEGER,
    field: 'store_id',
  })
  storeId: number;

  @BelongsTo(() => Store)
  store: Store;

  @ForeignKey(() => Label)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  display_label_id: number;

  @BelongsTo(() => Label, 'display_label_id')
  displayLabel: Label;

  @ForeignKey(() => Label)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  item_label_id: number;

  @BelongsTo(() => Label, 'item_label_id')
  itemLabel: Label;
}
