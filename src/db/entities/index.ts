import { ActivityLog } from './audit/activityLog';
import { Audit } from './audit/audit';
import { AuditItem } from './audit/auditItem';
import { AuditSession } from './audit/auditSession';
import { Revinfo } from './audit/revinfo';
import { Authenticate } from './auth/authenticateSchema';
import { UserLoginToken } from './auth/userLoginToken';
import { Channel } from './channel/channel';
import { CallLog } from './call/callLog';
import { CustomerInventory } from './consumer/consumerInventory';
import { ConsumerProductList } from './consumer/consumerProducts';
import { ConsumerProductsMapping } from './consumer/consumerProductsMapping';
import { ConsumerProductVariants } from './consumer/consumerProductVariants';
import { ConsumerShippingAddress } from './consumer/consumerShippingAddress';
import { AccessPackageBrandItemsCapacity } from './consumerOrders/access_list/AccessPackageBrandItemCapacity';
import { AccessPackageBrandItemsQty } from './consumerOrders/access_list/AccessPackageBrandItemQty';
import { AccessPackageBrandItems } from './consumerOrders/access_list/AccessPackageBrandItems';
import { AccessPackageBrand } from './consumerOrders/access_list/AccessPackageBrands';
import { AccessPackageCustomer } from './consumerOrders/access_list/AccessPackageCustomers';
import { AccessPackageOrder } from './consumerOrders/access_list/AccessPackageOrder';
import { PackageBrandItemsCapacity } from './consumerOrders/package/packageBrandItemCapacity';
import { PackageBrandItemsQty } from './consumerOrders/package/packageBrandItemQty';
import { PackageBrandItems } from './consumerOrders/package/packageBrandItems';
import { PackageBrand } from './consumerOrders/package/packageBrands';
import { PackageCustomer } from './consumerOrders/package/packageCustomers';
import { PackageOrder } from './consumerOrders/package/packageOrder';
import { PackagePayment } from './consumerOrders/package/packagePayment';
import { PackageShipment } from './consumerOrders/package/packageShipment';
import { Inventory } from './inventory/inventory';
import { InventoryRequest } from './inventory/inventoryRequest';
import { WithdrawnRequest } from './inventory/withdrawnRequest';
import { Invoice } from './invoice/invoice';
import { Variant } from './item/variant';
import { Location } from './location/location';
import { OrderItems } from './order/orderItems';
import { Orders } from './order/orders';
import { ShopifyOrderRequest } from './order/shopifyOrderreq';
import { CustomFieldDefinition } from './metaFields/customFieldDefinition';
import { CustomFieldValue } from './metaFields/customFieldValue';
import { CustomFieldValueAud } from './metaFields/customFieldValueAud';
import { PaymentForm } from './payment/paymentForm';
import { PayoutDetails } from './payout/payoutDetails';
import { PayoutHistory } from './payout/payoutHistory';
import { PayoutRecord } from './payout/payoutRecords';
import { Permission } from './permission/permission';
import { Role } from './permission/role';
import { RolePermission } from './permission/rolePermissionMapping';
import { PriceChangeRequest } from './pricing/priceChangeReq';
import { Brands } from './product/brand';
import { ProductList } from './product/productList';
import { RecipientDetails } from './recipient/recipientdetails';
import { Store } from './store/store';
import { StoreLocationMapping } from './store/store_location_mapping';
import { StoreAddress } from './store/storeAddress';
import { StoreBarcodeSequence } from './store/store_barcode_sequence';
import { StoreTagSource } from './tags/storeTagSource';
import { TemplateItemLabel } from './template/templateItemLabel';
import { TransferItem } from './transfer/transferItem';
import { TagSource } from './tags/tagSource';
import { Label } from './template/label';
import { Template } from './template/template';
import { TemplateOption, TemplateOptionValue } from './template/templateOption';
import { Customers } from './user/customer';
import { Addresses } from './user/addresses';
import { CustomerStoreMapping } from './user/customerStoreMapping';
import { User } from './user/user';
import { UserStoreMapping } from './user/userStoreMapping';
import { UserForgotToken } from './user/userForgotToken';

export const ENTITIES = [
  ActivityLog,
  Audit,
  AuditItem,
  AuditSession,
  Authenticate,
  User,
  UserLoginToken,
  Channel,
  CallLog,
  Customers,
  Addresses,
  CustomerStoreMapping,
  CustomerInventory,
  ConsumerProductList,
  ConsumerProductsMapping,
  ConsumerProductVariants,
  ConsumerShippingAddress,
  CustomFieldDefinition,
  CustomFieldValue,
  CustomFieldValueAud,
  AccessPackageBrandItemsCapacity,
  AccessPackageBrandItemsQty,
  AccessPackageBrandItems,
  AccessPackageBrand,
  AccessPackageCustomer,
  AccessPackageOrder,
  PackageBrandItemsCapacity,
  PackageBrandItemsQty,
  PackageBrandItems,
  PackageBrand,
  PackageCustomer,
  PackageOrder,
  PackagePayment,
  PackageShipment,
  PaymentForm,
  Inventory,
  InventoryRequest,
  Invoice,
  Variant,
  Location,
  OrderItems,
  Orders,
  ShopifyOrderRequest,
  PayoutDetails,
  PayoutHistory,
  PayoutRecord,
  Permission,
  Role,
  RolePermission,
  PriceChangeRequest,
  Brands,
  ProductList,
  RecipientDetails,
  Revinfo,
  StoreLocationMapping,
  Store,
  StoreAddress,
  StoreBarcodeSequence,
  StoreTagSource,
  TagSource,
  Label,
  Template,
  TemplateItemLabel,
  TemplateOption,
  TemplateOptionValue,
  TransferItem,
  UserStoreMapping,
  UserForgotToken,
  WithdrawnRequest,
];

export {
  ActivityLog,
  AccessPackageBrand,
  AccessPackageBrandItems,
  AccessPackageBrandItemsCapacity,
  AccessPackageBrandItemsQty,
  AccessPackageCustomer,
  AccessPackageOrder,
  Audit,
  AuditItem,
  AuditSession,
  Authenticate,
  Brands,
  Channel,
  CallLog,
  ConsumerProductList,
  ConsumerProductsMapping,
  ConsumerProductVariants,
  ConsumerShippingAddress,
  CustomFieldDefinition,
  CustomFieldValue,
  CustomFieldValueAud,
  CustomerInventory,
  Customers,
  Addresses,
  CustomerStoreMapping,
  Inventory,
  InventoryRequest,
  Invoice,
  Label,
  Location,
  OrderItems,
  Orders,
  PackageBrand,
  PackageBrandItems,
  PackageBrandItemsCapacity,
  PackageBrandItemsQty,
  PackageCustomer,
  PackageOrder,
  PackagePayment,
  PackageShipment,
  PaymentForm,
  PayoutDetails,
  PayoutHistory,
  PayoutRecord,
  Permission,
  PriceChangeRequest,
  ProductList,
  RecipientDetails,
  Revinfo,
  Role,
  RolePermission,
  ShopifyOrderRequest,
  Store,
  StoreAddress,
  StoreBarcodeSequence,
  StoreLocationMapping,
  StoreTagSource,
  TagSource,
  Template,
  TemplateItemLabel,
  TemplateOption,
  TemplateOptionValue,
  TransferItem,
  User,
  UserLoginToken,
  UserStoreMapping,
  UserForgotToken,
  Variant,
  WithdrawnRequest,
};
