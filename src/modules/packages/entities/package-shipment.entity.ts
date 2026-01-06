import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { PackageOrder } from './package-order.entity';

@Table({
  tableName: 'PackageShipments',
  timestamps: true,
})
export class PackageShipment extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @ForeignKey(() => PackageOrder)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  package_id: number;

  @BelongsTo(() => PackageOrder)
  package: PackageOrder;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  localPickup: boolean;

  @Column(DataType.DATE)
  shipment_date: Date;

  @Column(DataType.STRING)
  shipping_carrier: string;

  @Column(DataType.STRING)
  tracking_number: string;
}
