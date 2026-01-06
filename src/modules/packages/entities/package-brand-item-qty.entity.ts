import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { PackageBrandItems } from './package-brand-items.entity';

@Table({
  tableName: 'PackageBrandItemsQty',
  freezeTableName: true,
  timestamps: true,
})
export class PackageBrandItemsQty extends Model {
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
    type: DataType.STRING,
    allowNull: false,
  })
  variant_size: string;

  @Column(DataType.INTEGER)
  maxCapacity: number;

  @Column(DataType.INTEGER)
  selectedCapacity: number;

  @Column(DataType.INTEGER)
  shortage: number;

  @Column(DataType.INTEGER)
  receivedQuantity: number;
}
