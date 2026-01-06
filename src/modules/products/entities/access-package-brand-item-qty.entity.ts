import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { AccessPackageBrandItems } from './access-package-brand-items.entity';

@Table({
  tableName: 'AccessPackageBrandItemsQty',
  freezeTableName: true,
  timestamps: true,
})
export class AccessPackageBrandItemsQty extends Model {
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
