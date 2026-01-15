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
export class Template extends Model {
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
  declare name: string;

  @Column({
    type: DataType.STRING,
    field: 'category',
  })
  declare category: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    field: 'show_location_on_barcode',
  })
  declare showLocationOnBarcode: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    field: 'show_price_on_barcode',
  })
  declare showPriceOnBarcode: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    field: 'charge_tax',
  })
  declare chargeTax: boolean;

  @Column({
    type: DataType.DOUBLE,
    field: 'tax_threshold',
  })
  declare taxThreshold: number;

  @Column({
    type: DataType.DOUBLE,
    field: 'weight',
  })
  declare weight: number;

  @Index('idx_store_id')
  @Column({
    type: DataType.INTEGER,
    field: 'store_id',
  })
  declare storeId: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    references: {
      model: 'label',
      key: 'id',
    },
    onDelete: 'CASCADE',
  })
  declare display_label_id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    references: {
      model: 'label',
      key: 'id',
    },
    onDelete: 'CASCADE',
  })
  declare item_label_id: number;
}
