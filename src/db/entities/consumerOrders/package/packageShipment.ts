import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { PackageOrder } from './packageOrder';

@Table({
  timestamps: true,
})
export class PackageShipment extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
  })
  declare id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    references: {
      model: 'PackageOrders',
      key: 'id',
    },
    onDelete: 'CASCADE',
  })
  package_id: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  })
  localPickup: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  shipment_date: Date;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  shipping_carrier: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  tracking_number: string;

  // Association properties (defined in packageASSOCIATION.ts)
  declare order?: PackageOrder;
}
