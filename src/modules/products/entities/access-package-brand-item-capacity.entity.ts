import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { AccessPackageBrandItems } from './access-package-brand-items.entity';

@Table({
  tableName: 'AccessPackageBrandItemsCapacity',
  timestamps: true,
})
export class AccessPackageBrandItemsCapacity extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @ForeignKey(() => AccessPackageBrandItems)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  item_id: number;

  @BelongsTo(() => AccessPackageBrandItems)
  item: AccessPackageBrandItems;

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
