import { accessListAssociations } from './accessListASSOCIATION';
import { auditAssociations } from './auditASSOCIATION';
import { consumerInventoryAssociations } from './consumerInventoryASSOCIATION';
import { inventVariantAssociations } from './InventVariantASSOCIATION';
import { invoiceAssociations } from './invoiceASSOCIATION';
import { packageAssociations } from './packageASSOCIATION';
import { rolePermissionAssociations } from './rolePermissionASSOCIATION';
import { storeAddressAssociations } from './storeAddressASSOCIATION';
import { storeTagAssociations } from './storeTagASSOCIATION';
import { templateLabelAssociations } from './template-labelASSOCIATION';
import { userAssociations } from './userASSOCIATION';

export const initAssociations = () => {
  accessListAssociations();
  auditAssociations();
  consumerInventoryAssociations();
  inventVariantAssociations();
  invoiceAssociations();
  packageAssociations();
  rolePermissionAssociations();
  storeAddressAssociations();
  storeTagAssociations();
  templateLabelAssociations();
  userAssociations();
};
