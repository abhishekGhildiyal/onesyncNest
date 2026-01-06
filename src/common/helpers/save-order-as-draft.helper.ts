import { BadRequestException } from '@nestjs/common';
import { AccessPackageOrder } from '../../modules/products/entities/access-package-order.entity';
import { Store } from '../../modules/users/entities/store.entity';
import { PackageOrder } from '../../modules/packages/entities/package-order.entity';
import { PackageCustomer } from '../../modules/packages/entities/package-customer.entity';
import { Brand } from '../../modules/products/entities/brand.entity';
import { PackageBrand } from '../../modules/packages/entities/package-brand.entity';
import { PackageBrandItems } from '../../modules/packages/entities/package-brand-items.entity';
import { PackageBrandItemsCapacity } from '../../modules/packages/entities/package-brand-item-capacity.entity';
import { PackageBrandItemsQty } from '../../modules/packages/entities/package-brand-item-qty.entity';
import { generateOrderId } from './order-generator.helper';
import { PACKAGE_STATUS, PAYMENT_STATUS } from '../constants/enum';
import { AllMessages } from '../constants/messages';
import { Transaction } from 'sequelize';

export const saveOrderAsDraftHelper = async ({
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
    const accessOrder = await AccessPackageOrder.findByPk(accessPackageId, {
      transaction,
    });
    if (!accessOrder) {
      throw new BadRequestException(AllMessages.PAKG_NF);
    }

    // Fetch store for order_id prefix
    const store = await Store.findByPk(accessOrder.store_id, {
      attributes: ['store_code', 'store_name', 'store_id'],
      transaction,
    });

    if (!store) {
      throw new BadRequestException('Store not found.');
    }

    // Create draft PackageOrder
    const orderId = await generateOrderId({
      storeId: store.store_id,
      prefix: store.store_code,
      model: PackageOrder,
      transaction,
    });

    const pkg = await PackageOrder.create(
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
    await PackageCustomer.create(
      { package_id: pkg.id, customer_id: userId },
      { transaction },
    );

    // Validate brands from frontend
    const brandIds = brands.map((b) => b.brand_id).filter(Boolean);
    const validBrands = await Brand.findAll({
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
    const packageBrands = await PackageBrand.bulkCreate(brandPayload, {
      transaction,
      returning: true,
    });

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
    const createdItems = await PackageBrandItems.bulkCreate(
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

    await PackageBrandItemsCapacity.bulkCreate(finalVariantInsert, {
      transaction,
    });

    // Bulk insert variant sizes and quantities
    const finalSizeInsert = sizeQtyArr
      .map((x) => ({
        item_id: tempIdToItemId.get(x.tempId),
        variant_size: x.variant_size,
        maxCapacity: x.maxCapacity,
      }))
      .filter((x) => !!x.item_id);

    await PackageBrandItemsQty.bulkCreate(finalSizeInsert, {
      transaction,
    });

    return pkg;
  } catch (err) {
    if (err instanceof BadRequestException) throw err;
    console.error('saveOrderAsDraftHelper error:', err);
    throw new BadRequestException(err.message || AllMessages.SMTHG_WRNG);
  }
};
