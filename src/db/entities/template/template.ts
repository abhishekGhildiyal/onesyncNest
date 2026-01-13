import {
  AutoIncrement,
  Column,
  DataType,
  Index,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'template',
  timestamps: false,
})
export class Template extends Model<Template> {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
    field: 'id',
  })
  declare id: number;

  @Column({
    type: DataType.STRING,
    field: 'name',
  })
  name: string;

  @Column({
    type: DataType.STRING,
    field: 'category',
  })
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

  @Column({
    type: DataType.DOUBLE,
    field: 'weight',
  })
  weight: number;

  @Index('idx_store_id')
  @Column({
    type: DataType.INTEGER,
    field: 'store_id',
  })
  storeId: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    references: {
      model: 'label',
      key: 'id',
    },
    onDelete: 'CASCADE',
  })
  display_label_id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    references: {
      model: 'label',
      key: 'id',
    },
    onDelete: 'CASCADE',
  })
  item_label_id: number;
}
