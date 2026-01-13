import { accessListAssociations } from './accessListASSOCIATION';
import { consumerInventoryAssociations } from './consumerInventoryASSOCIATION';
import { inventVariantAssociations } from './InventVariantASSOCIATION';
import { invoiceAssociations } from './invoiceASSOCIATION';
import { packageAssociations } from './packageASSOCIATION';
import { rolePermissionAssociations } from './rolePermissionASSOCIATION';
import { storeAddressAssociations } from './storeAddressASSOCIATION';
import { templateLabelAssociations } from './template-labelASSOCIATION';
import { userAssociations } from './userASSOCIATION';

export const initAssociations = () => {
  accessListAssociations();
  consumerInventoryAssociations();
  inventVariantAssociations();
  invoiceAssociations();
  packageAssociations();
  rolePermissionAssociations();
  storeAddressAssociations();
  templateLabelAssociations();
  userAssociations();
};
