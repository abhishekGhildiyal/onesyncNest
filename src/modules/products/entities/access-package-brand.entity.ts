import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { AccessPackageOrder } from './access-package-order.entity';
import { AccessPackageBrandItems } from './access-package-brand-items.entity';

@Table({
  tableName: 'AccessPackageBrands',
  timestamps: true,
})
export class AccessPackageBrand extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @ForeignKey(() => AccessPackageOrder)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  package_id: number;

  @BelongsTo(() => AccessPackageOrder)
  package: AccessPackageOrder;

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

  @HasMany(() => AccessPackageBrandItems, {
    foreignKey: 'packageBrand_id',
    onDelete: 'CASCADE',
    hooks: true,
  })
  items: AccessPackageBrandItems[];
}
