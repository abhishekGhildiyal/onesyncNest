import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { Variant } from '../../item/variant';
import { PackageBrandItems } from './packageBrandItems';

@Table({
  timestamps: true,
})
export class PackageBrandItemsCapacity extends Model {
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
    type: DataType.INTEGER,
    allowNull: false,
  })
  variant_id: number;

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

  // Association properties (defined in packageASSOCIATION.ts)
  declare item?: PackageBrandItems;
  declare variant?: Variant;
}
