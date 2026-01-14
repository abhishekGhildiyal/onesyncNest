import { BadRequestException, Injectable } from '@nestjs/common';

import { Transaction } from 'sequelize';
import { PackageRepository } from 'src/db/repository/package.repository';
import { ProductRepository } from 'src/db/repository/product.repository';
import { StoreRepository } from 'src/db/repository/store.repository';
import { UserRepository } from 'src/db/repository/user.repository';
import { PACKAGE_STATUS, PAYMENT_STATUS } from '../constants/enum';
import { AllMessages } from '../constants/messages';
import { generateOrderId } from './order-generator.helper';

@Injectable()
export class SaveOrderAsDraftHelper {
  constructor(
    private readonly pkgRepo: PackageRepository,
    private readonly userRepo: UserRepository,
    private readonly storeRepo: StoreRepository,
    private readonly productRepo: ProductRepository,
  ) {}

  saveOrderAsDraftHelper = async ({
    accessPackageId,
    userId,
    brands,
    transaction,
  }: {
    accessPackageId: number;
    userId: number;
    brands: any[]; // Define a stricter interface if possible
    transaction: Transaction;
  }) => {
    try {
      // Fetch Access Package Order
      const accessOrder = await this.pkgRepo.accessPackageOrderModel.findByPk(
        accessPackageId,
        {
          transaction,
        },
      );
      if (!accessOrder) {
        throw new BadRequestException(AllMessages.PAKG_NF);
      }

      // Fetch store for order_id prefix
      const store = await this.storeRepo.storeModel.findByPk(
        accessOrder.store_id,
        {
          attributes: ['store_code', 'store_name', 'store_id'],
          transaction,
        },
      );

      if (!store) {
        throw new BadRequestException('Store not found.');
      }

      // Create draft PackageOrder
      const orderId = await generateOrderId({
        storeId: store.store_id,
        prefix: store.store_code,
        model: this.pkgRepo.packageOrderModel,
        transaction,
      });

      const pkg = await this.pkgRepo.packageOrderModel.create(
        {
          packageName: accessOrder.packageName,
          user_id: accessOrder.user_id,
          order_id: orderId,
          store_id: accessOrder.store_id,
          status: PACKAGE_STATUS.DRAFT,
          paymentStatus: PAYMENT_STATUS.PENDING,
          shipmentStatus: false,
        },
        { transaction },
      );

      // Add PackageCustomer linking user to the package
      await this.pkgRepo.packageCustomerModel.create(
        { package_id: pkg.id, customer_id: userId },
        { transaction },
      );

      // Validate brands from frontend
      const brandIds = brands.map((b) => b.brand_id).filter(Boolean);
      const validBrands = await this.productRepo.brandModel.findAll({
        where: { id: brandIds },
        transaction,
      });
      const brandIdSet = new Set(validBrands.map((b) => b.id));

      // Prepare brand payload for bulk create
      const brandPayload = brands
        .filter((b) => brandIdSet.has(b.brand_id) && b.items?.length > 0)
        .map((b) => ({
          package_id: pkg.id,
          brand_id: b.brand_id,
        }));

      // Create PackageBrands
      const packageBrands = await this.pkgRepo.packageBrandModel.bulkCreate(
        brandPayload,
        {
          transaction,
          returning: true,
        },
      );

      // Map brand_id to created packageBrand id
      const brandIdToPkgBrandId = new Map();
      packageBrands.forEach((b) => brandIdToPkgBrandId.set(b.brand_id, b.id));

      // Prepare records for items, variants, size-qty
      const itemRecords: any[] = [];
      const variantRecords: any[] = [];
      const sizeQtyArr: any[] = [];

      for (const brand of brands) {
        if (!brandIdSet.has(brand.brand_id)) continue;

        const packageBrandId = brandIdToPkgBrandId.get(brand.brand_id);

        for (const item of brand.items || []) {
          const { product_id, variants = [], mainVariants = [] } = item;
          if (!product_id) continue;

          const tempId = `${packageBrandId}-${product_id}-${Math.random()}`;

          itemRecords.push({
            tempId,
            packageBrand_id: packageBrandId,
            product_id,
            quantity: null,
          });

          variantRecords.push(
            ...variants
              .filter((v: any) => v.variantId)
              .map((v: any) => ({
                tempId,
                variant_id: v.variantId,
                maxCapacity: v.maxCapacity || null,
              })),
          );

          sizeQtyArr.push(
            ...mainVariants.map((x: any) => ({
              tempId,
              variant_size: x.size,
              maxCapacity: x.quantity || null,
            })),
          );
        }
      }

      // Bulk insert items
      const createdItems = await this.pkgRepo.packageBrandItemsModel.bulkCreate(
        itemRecords.map((r) => ({
          packageBrand_id: r.packageBrand_id,
          product_id: r.product_id,
          quantity: r.quantity,
        })),
        { transaction, returning: true },
      );

      // Map tempId to created item id
      const tempIdToItemId = new Map();
      for (const item of createdItems) {
        const match = itemRecords.find(
          (r) =>
            r.packageBrand_id === item.packageBrand_id &&
            r.product_id === item.product_id &&
            r.quantity === item.quantity,
        );
        if (match) {
          tempIdToItemId.set(match.tempId, item.id);
        }
      }

      // Bulk insert variant capacities
      const finalVariantInsert = variantRecords
        .map((v) => ({
          item_id: tempIdToItemId.get(v.tempId),
          variant_id: v.variant_id,
          maxCapacity: v.maxCapacity,
        }))
        .filter((x) => !!x.item_id);

      await this.pkgRepo.packageBrandItemsCapacityModel.bulkCreate(
        finalVariantInsert,
        {
          transaction,
        },
      );

      // Bulk insert variant sizes and quantities
      const finalSizeInsert = sizeQtyArr
        .map((x) => ({
          item_id: tempIdToItemId.get(x.tempId),
          variant_size: x.variant_size,
          maxCapacity: x.maxCapacity,
        }))
        .filter((x) => !!x.item_id);

      await this.pkgRepo.packageBrandItemsQtyModel.bulkCreate(finalSizeInsert, {
        transaction,
      });

      return pkg;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      console.error('saveOrderAsDraftHelper error:', err);
      throw new BadRequestException(err.message || AllMessages.SMTHG_WRNG);
    }
  };
}
