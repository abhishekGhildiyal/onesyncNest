import {
  AutoIncrement,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Index,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'location',
  timestamps: false,
})
export class Location extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.BIGINT,
  })
  declare id: number;

  @Column({
    type: DataType.STRING,
  })
  declare name: string;

  @Index('idx_location_store_id')
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'store_id',
  })
  declare storeId: number;

  // Self-referencing foreign key: points to another location in the same table
  // This creates the parent-child hierarchy
  @ForeignKey(() => Location)
  @Column({
    type: DataType.BIGINT,
    allowNull: true, // null = root location (no parent)
    field: 'parent_id',
  })
  declare parentId: number;

  // ONE location can have MANY child locations
  // Example: Warehouse → [Aisle A, Aisle B, Aisle C]
  // When parent is deleted, all children are automatically deleted (CASCADE)
  @HasMany(() => Location, {
    foreignKey: 'parentId', // Children have this location's id as their parentId
    onDelete: 'CASCADE', // Delete children when parent is deleted
  })
  declare children: Location[];

  // ONE location can belong to ONE parent location
  // Example: Shelf 1 → belongs to → Aisle A
  @BelongsTo(() => Location, {
    foreignKey: 'parentId', // This location's parent is referenced by parentId
  })
  declare parent: Location;
}
