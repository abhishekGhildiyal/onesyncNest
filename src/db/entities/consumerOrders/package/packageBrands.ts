import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { Brands } from '../../product/brand';
import { PackageBrandItems } from './packageBrandItems';
import { PackageOrder } from './packageOrder';

@Table({
  timestamps: true,
})
export class PackageBrand extends Model {
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
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare brand_id: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  })
  declare selected: boolean;

  // Association properties (defined in packageASSOCIATION.ts)
  declare items?: PackageBrandItems[];
  declare order?: PackageOrder;
  declare brandData?: Brands;
}
