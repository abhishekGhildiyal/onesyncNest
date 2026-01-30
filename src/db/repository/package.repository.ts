import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import {
  AccessPackageBrand,
  AccessPackageBrandItems,
  AccessPackageBrandItemsCapacity,
  AccessPackageBrandItemsQty,
  AccessPackageCustomer,
  AccessPackageOrder,
  ConsumerProductList,
  ConsumerProductsMapping,
  ConsumerProductVariants,
  ConsumerShippingAddress,
  CustomerInventory,
  Invoice,
  PackageBrand,
  PackageBrandItems,
  PackageBrandItemsCapacity,
  PackageBrandItemsQty,
  PackageCustomer,
  PackageOrder,
  PackagePayment,
  PackageShipment,
} from '../entities';

@Injectable()
export class PackageRepository {
  constructor(
    @InjectModel(AccessPackageBrandItemsCapacity)
    public readonly accessPackageBrandItemsCapacityModel: typeof AccessPackageBrandItemsCapacity,
    @InjectModel(AccessPackageBrandItemsQty)
    public readonly accessPackageBrandItemsQtyModel: typeof AccessPackageBrandItemsQty,
    @InjectModel(AccessPackageBrandItems)
    public readonly accessPackageBrandItemsModel: typeof AccessPackageBrandItems,
    @InjectModel(AccessPackageBrand)
    public readonly accessPackageBrandModel: typeof AccessPackageBrand,
    @InjectModel(AccessPackageCustomer)
    public readonly accessPackageCustomerModel: typeof AccessPackageCustomer,
    @InjectModel(AccessPackageOrder)
    public readonly accessPackageOrderModel: typeof AccessPackageOrder,

    @InjectModel(PackageBrandItemsCapacity)
    public readonly packageBrandItemsCapacityModel: typeof PackageBrandItemsCapacity,
    @InjectModel(PackageBrandItemsQty)
    public readonly packageBrandItemsQtyModel: typeof PackageBrandItemsQty,
    @InjectModel(PackageBrandItems)
    public readonly packageBrandItemsModel: typeof PackageBrandItems,
    @InjectModel(PackageBrand)
    public readonly packageBrandModel: typeof PackageBrand,
    @InjectModel(PackageCustomer)
    public readonly packageCustomerModel: typeof PackageCustomer,
    @InjectModel(PackageOrder)
    public readonly packageOrderModel: typeof PackageOrder,
    @InjectModel(PackagePayment)
    public readonly packagePaymentModel: typeof PackagePayment,
    @InjectModel(PackageShipment)
    public readonly packageShipmentModel: typeof PackageShipment,

    @InjectModel(CustomerInventory)
    public readonly consumerInventoryModel: typeof CustomerInventory,
    @InjectModel(ConsumerProductList)
    public readonly consumerProductModel: typeof ConsumerProductList,
    @InjectModel(ConsumerProductVariants)
    public readonly consumerProductVariantModel: typeof ConsumerProductVariants,
    @InjectModel(ConsumerProductsMapping)
    public readonly consumerProductsMappingModel: typeof ConsumerProductsMapping,
    @InjectModel(ConsumerShippingAddress)
    public readonly consumerShippingModel: typeof ConsumerShippingAddress,

    @InjectModel(Invoice)
    public readonly invoiceModel: typeof Invoice,
  ) {}
}
