import { Audit } from './audit/audit';
import { Authenticate } from './auth/authenticateSchema';
import { UserLoginToken } from './auth/userLoginToken';
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
import { ShopifyOrderRequest } from './order/shopifyOrderreq';
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
import { TagSource } from './tags/tagSource';
import { Label } from './template/label';
import { Template } from './template/template';
import { TemplateOption, TemplateOptionValue } from './template/templateOption';
import { Customers } from './user/customer';
import { User } from './user/user';
import { UserStoreMapping } from './user/userStoreMapping';

export const ENTITIES = [
  Audit,
  Authenticate,
  User,
  UserLoginToken,
  CallLog,
  Customers,
  CustomerInventory,
  ConsumerProductList,
  ConsumerProductsMapping,
  ConsumerProductVariants,
  ConsumerShippingAddress,
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
  Inventory,
  InventoryRequest,
  Invoice,
  Variant,
  Location,
  OrderItems,
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
  StoreLocationMapping,
  Store,
  StoreAddress,
  TagSource,
  Label,
  Template,
  TemplateOption,
  TemplateOptionValue,
  UserStoreMapping,
  WithdrawnRequest,
];

export {
  AccessPackageBrand,
  AccessPackageBrandItems,
  AccessPackageBrandItemsCapacity,
  AccessPackageBrandItemsQty,
  AccessPackageCustomer,
  AccessPackageOrder,
  Audit,
  Authenticate,
  Brands,
  CallLog,
  ConsumerProductList,
  ConsumerProductsMapping,
  ConsumerProductVariants,
  ConsumerShippingAddress,
  CustomerInventory,
  Customers,
  Inventory,
  InventoryRequest,
  Invoice,
  Label,
  Location,
  OrderItems,
  PackageBrand,
  PackageBrandItems,
  PackageBrandItemsCapacity,
  PackageBrandItemsQty,
  PackageCustomer,
  PackageOrder,
  PackagePayment,
  PackageShipment,
  PayoutDetails,
  PayoutHistory,
  PayoutRecord,
  Permission,
  PriceChangeRequest,
  ProductList,
  RecipientDetails,
  Role,
  RolePermission,
  ShopifyOrderRequest,
  Store,
  StoreAddress,
  StoreLocationMapping,
  TagSource,
  Template,
  TemplateOption,
  TemplateOptionValue,
  User,
  UserLoginToken,
  UserStoreMapping,
  Variant,
  WithdrawnRequest,
};
