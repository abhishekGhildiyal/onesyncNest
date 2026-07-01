import { Column, DataType, Model, PrimaryKey, Table } from 'sequelize-typescript';

@Table({
  tableName: 'custom_field_value_aud',
  timestamps: false,
})
export class CustomFieldValueAud extends Model {
  @PrimaryKey
  @Column(DataType.BIGINT)
  declare id: number;

  @PrimaryKey
  @Column(DataType.INTEGER)
  declare rev: number;

  @Column(DataType.TINYINT)
  declare revtype: number;

  @Column({ type: DataType.STRING, field: 'data_type' })
  declare data_type: string;

  @Column({ type: DataType.BOOLEAN, field: 'data_type_mod' })
  declare data_type_mod: boolean;

  @Column({ type: DataType.STRING, field: 'field_name' })
  declare field_name: string;

  @Column({ type: DataType.BOOLEAN, field: 'field_name_mod' })
  declare field_name_mod: boolean;

  @Column({ type: DataType.STRING, field: 'field_value' })
  declare field_value: string;

  @Column({ type: DataType.BOOLEAN, field: 'field_value_mod' })
  declare field_value_mod: boolean;

  @Column({ type: DataType.INTEGER, field: 'store_id' })
  declare store_id: number;

  @Column({ type: DataType.BOOLEAN, field: 'store_id_mod' })
  declare store_id_mod: boolean;

  @Column({ type: DataType.STRING, field: 'table_name' })
  declare table_name: string;

  @Column({ type: DataType.BOOLEAN, field: 'table_name_mod' })
  declare table_name_mod: boolean;

  @Column({ type: DataType.BIGINT, field: 'metafield_id' })
  declare metafield_id: number;

  @Column({ type: DataType.BOOLEAN, field: 'definition_mod' })
  declare definition_mod: boolean;

  @Column({ type: DataType.INTEGER, field: 'inventory_id' })
  declare inventory_id: number;

  @Column({ type: DataType.BOOLEAN, field: 'inventory_mod' })
  declare inventory_mod: boolean;

  @Column({ type: DataType.INTEGER, field: 'product_id' })
  declare product_id: number;

  @Column({ type: DataType.BOOLEAN, field: 'product_mod' })
  declare product_mod: boolean;

  @Column({ type: DataType.BIGINT, field: 'template_id' })
  declare template_id: number;

  @Column({ type: DataType.BOOLEAN, field: 'template_mod' })
  declare template_mod: boolean;

  @Column({ type: DataType.INTEGER, field: 'variant_id' })
  declare variant_id: number;

  @Column({ type: DataType.BOOLEAN, field: 'variant_mod' })
  declare variant_mod: boolean;
}
