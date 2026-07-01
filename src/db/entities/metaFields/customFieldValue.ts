import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'custom_field_value',
  timestamps: false,
})
export class CustomFieldValue extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT)
  declare id: number;

  @Column({ type: DataType.STRING, field: 'data_type' })
  declare data_type: string;

  @Column({ type: DataType.STRING, field: 'field_name' })
  declare field_name: string;

  @Column({ type: DataType.STRING, field: 'field_value' })
  declare field_value: string;

  @Column({ type: DataType.BIGINT, field: 'record_id' })
  declare record_id: number;

  @Column({ type: DataType.INTEGER, field: 'store_id' })
  declare store_id: number;

  @Column({ type: DataType.STRING, field: 'table_name' })
  declare table_name: string;

  @Column({ type: DataType.STRING, field: 'temp_key' })
  declare temp_key: string;

  @Column({ type: DataType.BIGINT, field: 'metafield_id' })
  declare metafield_id: number;

  @Column({ type: DataType.INTEGER, field: 'variant_id' })
  declare variant_id: number;

  @Column({ type: DataType.INTEGER, field: 'product_id' })
  declare product_id: number;

  @Column({ type: DataType.INTEGER, field: 'inventory_id' })
  declare inventory_id: number;

  @Column({ type: DataType.BIGINT, field: 'template_id' })
  declare template_id: number;
}
