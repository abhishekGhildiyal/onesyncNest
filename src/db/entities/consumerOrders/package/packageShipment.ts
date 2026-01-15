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
  declare package_id: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  })
  declare localPickup: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare shipment_date: Date;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare shipping_carrier: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare tracking_number: string;

  // Association properties (defined in packageASSOCIATION.ts)
  declare order?: PackageOrder;
}
