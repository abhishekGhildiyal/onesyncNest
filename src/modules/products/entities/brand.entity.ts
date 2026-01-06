import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, HasMany } from 'sequelize-typescript';
import { BRAND_STATUS, BRAND_TYPE } from '../../../common/constants/enum';
import { ProductList } from './product-list.entity';

@Table({
  tableName: 'brands',
  freezeTableName: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
})
export class Brand extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'brand_name',
  })
  brandName: string;

  @Column({
    type: DataType.ENUM(...Object.values(BRAND_STATUS)),
    allowNull: false,
  })
  status: BRAND_STATUS;

  @Column({
    type: DataType.ENUM(...Object.values(BRAND_TYPE)),
    allowNull: false,
  })
  type: BRAND_TYPE;

  @Column(DataType.INTEGER)
  store_id: number;

  @HasMany(() => ProductList, {
    foreignKey: 'brand_id',
    onDelete: 'CASCADE',
    hooks: true,
  })
  products: ProductList[];
}
