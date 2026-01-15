import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { ORDER_ITEMS } from 'src/common/constants/enum';
import { ProductList } from '../../product/productList';
import { PackageBrandItemsCapacity } from './packageBrandItemCapacity';
import { PackageBrandItemsQty } from './packageBrandItemQty';
import { PackageBrand } from './packageBrands';

@Table({
  timestamps: true,
})
export class PackageBrandItems extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
  })
  declare id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare product_id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    references: {
      model: 'PackageBrands',
      key: 'id',
    },
    onDelete: 'CASCADE',
  })
  declare packageBrand_id: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  declare price: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare quantity: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare consumerDemand: number;

  @Column({
    type: DataType.ENUM(...Object.values(ORDER_ITEMS)),
    defaultValue: null,
    allowNull: true,
  })
  declare isItemReceived: string;

  // Association properties (defined in packageASSOCIATION.ts)
  declare sizeQuantities?: PackageBrandItemsQty[];
  declare capacities?: PackageBrandItemsCapacity[];
  declare products?: ProductList;
  declare brand?: PackageBrand;
}
