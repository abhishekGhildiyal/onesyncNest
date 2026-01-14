import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { PackageBrandItems } from './packageBrandItems';

@Table({
  freezeTableName: true,
  timestamps: true,
})
export class PackageBrandItemsQty extends Model {
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
      model: 'PackageBrandItems',
      key: 'id',
    },
    onDelete: 'CASCADE',
  })
  item_id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  variant_size: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  maxCapacity: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  selectedCapacity: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  shortage: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  receivedQuantity: number;

  // Association properties (defined in packageASSOCIATION.ts)
  declare qtyItem?: PackageBrandItems;
}
