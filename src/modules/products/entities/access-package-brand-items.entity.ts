import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { AccessPackageBrand } from './access-package-brand.entity';
import { ProductList } from './product-list.entity';
import { ORDER_ITEMS } from '../../../common/constants/enum';
import { AccessPackageBrandItemsQty } from './access-package-brand-item-qty.entity';
import { AccessPackageBrandItemsCapacity } from './access-package-brand-item-capacity.entity';

@Table({
  tableName: 'AccessPackageBrandItems',
  timestamps: true,
})
export class AccessPackageBrandItems extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @ForeignKey(() => ProductList)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  product_id: number;

  @BelongsTo(() => ProductList)
  products: ProductList;

  @ForeignKey(() => AccessPackageBrand)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  packageBrand_id: number;

  @BelongsTo(() => AccessPackageBrand)
  packageBrand: AccessPackageBrand;

  @Column(DataType.DOUBLE)
  price: number;

  @Column(DataType.INTEGER)
  quantity: number;

  @Column(DataType.INTEGER)
  consumerDemand: number;

  @Column({
    type: DataType.ENUM(...Object.values(ORDER_ITEMS)),
    defaultValue: null,
    allowNull: true,
  })
  isItemReceived: ORDER_ITEMS;

  @HasMany(() => AccessPackageBrandItemsQty, {
    foreignKey: 'item_id',
    onDelete: 'CASCADE',
    hooks: true,
  })
  quantities: AccessPackageBrandItemsQty[];

  @HasMany(() => AccessPackageBrandItemsCapacity, {
    foreignKey: 'item_id',
    onDelete: 'CASCADE',
    hooks: true,
  })
  capacities: AccessPackageBrandItemsCapacity[];
}
