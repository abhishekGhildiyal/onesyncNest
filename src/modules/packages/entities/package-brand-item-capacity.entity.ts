import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { PackageBrandItems } from './package-brand-items.entity';

@Table({
  tableName: 'PackageBrandItemsCapacity',
  timestamps: true,
})
export class PackageBrandItemsCapacity extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @ForeignKey(() => PackageBrandItems)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  item_id: number;

  @BelongsTo(() => PackageBrandItems)
  item: PackageBrandItems;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  variant_id: number;

  @Column(DataType.INTEGER)
  maxCapacity: number;

  @Column(DataType.INTEGER)
  selectedCapacity: number;
}
