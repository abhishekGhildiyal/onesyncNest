import { Column, DataType, Model, PrimaryKey, Table } from 'sequelize-typescript';

@Table({
  tableName: 'template_item_labels',
  timestamps: false,
})
export class TemplateItemLabel extends Model {
  @PrimaryKey
  @Column({ type: DataType.INTEGER, field: 'template_id' })
  declare template_id: number;

  @PrimaryKey
  @Column(DataType.INTEGER)
  declare label_id: number;
}
