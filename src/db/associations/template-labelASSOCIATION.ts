import { Label, Template, TemplateItemLabel } from '../entities';

export const templateLabelAssociations = () => {
  Template.belongsTo(Label, {
    foreignKey: 'display_label_id',
    onDelete: 'SET NULL',
  });

  Template.belongsTo(Label, {
    foreignKey: 'item_label_id',
    onDelete: 'SET NULL',
  });

  TemplateItemLabel.belongsTo(Template, {
    foreignKey: 'template_id',
    as: 'template',
  });
};
