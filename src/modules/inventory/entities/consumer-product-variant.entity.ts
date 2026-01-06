import { Table, Column, Model, DataType, BelongsTo, ForeignKey } from 'sequelize-typescript';
import { ConsumerProductList } from './consumer-product-list.entity';
import { User } from '../../users/entities/user.entity';

@Table({
  tableName: 'consumer_product_variants',
  timestamps: true,
})
export class ConsumerProductVariant extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @Column(DataType.STRING)
  size: string;

  @Column(DataType.DOUBLE)
  price: number;

  @Column(DataType.STRING)
  note: string;

  @Column({
    type: DataType.DATE,
    field: 'purchase_date',
  })
  purchaseDate: Date;

  @Column({
    type: DataType.STRING,
    field: 'purchase_order_no',
  })
  purchaseOrderNo: string;

  @Column({
    type: DataType.STRING,
    field: 'purchase_from_vendor',
  })
  purchaseFromVendor: string;

  @Column({
    type: DataType.BIGINT,
    field: 'package_id',
  })
  packageId: number;

  @Column({
    type: DataType.INTEGER,
    field: 'original_quantity',
  })
  originalQuantity: number;

  @Column({
    type: DataType.INTEGER,
    field: 'selected_quantity',
  })
  selectedQuantity: number;

  @Column({
    type: DataType.INTEGER,
    field: 'received_quantity',
  })
  receivedQuantity: number;

  @ForeignKey(() => ConsumerProductList)
  @Column({
    type: DataType.INTEGER,
    field: 'product_id',
  })
  productId: number;

  @BelongsTo(() => ConsumerProductList)
  product: ConsumerProductList;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    field: 'user_id',
  })
  userId: number;

  @BelongsTo(() => User)
  user: User;
}
