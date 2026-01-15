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
  declare item_id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare variant_id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare maxCapacity: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare selectedCapacity: number;

  // Association properties (defined in packageASSOCIATION.ts)
  declare item?: PackageBrandItems;
  declare variant?: Variant;
}
