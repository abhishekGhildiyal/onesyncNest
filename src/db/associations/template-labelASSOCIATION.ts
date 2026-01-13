import { Label, Template } from '../entities';

export const templateLabelAssociations = () => {
  Template.belongsTo(Label, {
    foreignKey: 'display_label_id',
    onDelete: 'SET NULL',
  });

  Template.belongsTo(Label, {
    foreignKey: 'item_label_id',
    onDelete: 'SET NULL',
  });
};
