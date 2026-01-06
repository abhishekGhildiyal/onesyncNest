import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { PackageOrder } from './package-order.entity';
import { PackageBrandItems } from './package-brand-items.entity';

@Table({
  tableName: 'PackageBrands',
  timestamps: true,
})
export class PackageBrand extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @ForeignKey(() => PackageOrder)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  package_id: number;

  @BelongsTo(() => PackageOrder)
  package: PackageOrder;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  brand_id: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  selected: boolean;

  @HasMany(() => PackageBrandItems, {
    foreignKey: 'packageBrand_id',
    onDelete: 'CASCADE',
    hooks: true,
  })
  items: PackageBrandItems[];
}
