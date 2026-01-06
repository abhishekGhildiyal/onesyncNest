import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { PackageBrand } from './package-brand.entity';
import { ORDER_ITEMS } from '../../../common/constants/enum';
import { PackageBrandItemsQty } from './package-brand-item-qty.entity';
import { PackageBrandItemsCapacity } from './package-brand-item-capacity.entity';
import { ProductList } from '../../products/entities/product-list.entity';

@Table({
  tableName: 'PackageBrandItems',
  timestamps: true,
})
export class PackageBrandItems extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  product_id: number;

  @ForeignKey(() => PackageBrand)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  packageBrand_id: number;

  @BelongsTo(() => PackageBrand)
  packageBrand: PackageBrand;

  @Column(DataType.DOUBLE)
  price: number;

  @Column(DataType.INTEGER)
  quantity: number;

  @Column(DataType.INTEGER)
  consumerDemand: number;

  @Column({
    type: DataType.ENUM(...Object.values(ORDER_ITEMS)),
    allowNull: true,
    defaultValue: null,
  })
  isItemReceived: ORDER_ITEMS;

  @HasMany(() => PackageBrandItemsQty, {
    foreignKey: 'item_id',
    onDelete: 'CASCADE',
    hooks: true,
  })
  sizeQuantities: PackageBrandItemsQty[];

  @HasMany(() => PackageBrandItemsCapacity, {
    foreignKey: 'item_id',
    onDelete: 'CASCADE',
    hooks: true,
  })
  capacities: PackageBrandItemsCapacity[];

  @BelongsTo(() => ProductList, 'product_id')
  products: ProductList;
}
