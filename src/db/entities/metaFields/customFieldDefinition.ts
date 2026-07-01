import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'custom_field_definition',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
})
export class CustomFieldDefinition extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT)
  declare id: number;

  @Column({ type: DataType.STRING, field: 'data_type' })
  declare data_type: string;

  @Column({ type: DataType.STRING, field: 'field_name' })
  declare field_name: string;

  @Column({ type: DataType.INTEGER, field: 'store_id' })
  declare store_id: number;

  @Column({ type: DataType.STRING, field: 'table_name' })
  declare table_name: string;

  @Column(DataType.STRING)
  declare validation: string;

  @Column({ type: DataType.BOOLEAN, field: 'allow_multiple_selections', defaultValue: false })
  declare allow_multiple_selections: boolean;

  @Column({ type: DataType.BOOLEAN, field: 'define_preset_options', defaultValue: false })
  declare define_preset_options: boolean;

  @Column({ type: DataType.BOOLEAN, field: 'is_enabled', defaultValue: false })
  declare is_enabled: boolean;

  @Column({ type: DataType.BOOLEAN, field: 'is_required', defaultValue: false })
  declare is_required: boolean;

  @Column({ type: DataType.BOOLEAN, field: 'enable_range', defaultValue: false })
  declare enable_range: boolean;

  @Column({ type: DataType.BOOLEAN, field: 'show_in_add_item', defaultValue: false })
  declare show_in_add_item: boolean;

  @Column({ type: DataType.INTEGER, field: 'sort_order' })
  declare sort_order: number;
}
