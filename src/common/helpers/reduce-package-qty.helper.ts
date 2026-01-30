import { Op, Sequelize, Transaction } from 'sequelize';

import { Injectable } from '@nestjs/common';
import { PackageRepository } from 'src/db/repository/package.repository';
import { ProductRepository } from 'src/db/repository/product.repository';
import { PACKAGE_STATUS } from '../constants/enum';

const ACTIVE_STATUSES = [
  PACKAGE_STATUS.DRAFT,
  PACKAGE_STATUS.CREATED, // Note: CREATED might not be in enum, check definition
  PACKAGE_STATUS.SUBMITTED,
  PACKAGE_STATUS.INITIATED,
  PACKAGE_STATUS.IN_REVIEW,
  PACKAGE_STATUS.CONFIRM,
];

// Ensure valid statuses are used (filter out undefined if enum mismatch)
const VALID_ACTIVE_STATUSES = ACTIVE_STATUSES.filter((s) => s !== undefined);

@Injectable()
export class ReducePackageQuantity {
  constructor(
    private readonly productrepo: ProductRepository,
    private readonly pkgRepo: PackageRepository,
  ) {}

  reduceSoldQuantityForPackages = async ({
    product_id,
    storeId,
    size,
    soldQty,
    transaction,
    excludeOrderId = undefined,
    brandId = undefined,
  }: {
    product_id: number;
    storeId: number | string;
    size: string;
    soldQty: number;
    transaction: Transaction;
    excludeOrderId?: number;
    brandId?: number;
  }) => {
    // console.log(`🧩 [reduceSoldQuantityForPackages] Syncing packages...`);

    if (!size) {
      console.warn(`⚠️ Variant ${product_id} has undefined size, skipping capacity sync.`);
      return;
    }

    // Step 1: Get ACTUAL remaining stock from VariantModel
    const remainingVariantStock = await this.productrepo.variantModel.sum('quantity', {
      where: {
        product_id,
        status: 1,
        [Op.and]: Sequelize.where(Sequelize.fn('TRIM', Sequelize.col('option1Value')), size),
      },
      transaction,
    });

    const remainingStock = remainingVariantStock || 0;
    // console.log(`📦 ACTUAL Remaining Stock for (${product_id}, ${size}) = ${remainingStock}`);

    // Step 2: Get active packages (excluding current order)
    const whereClause: any = {
      status: { [Op.in]: VALID_ACTIVE_STATUSES },
      store_id: storeId,
    };
    if (excludeOrderId) {
      whereClause.id = { [Op.ne]: excludeOrderId };
    }

    const activePackages = await this.pkgRepo.packageOrderModel.findAll({
      where: whereClause,
      attributes: ['id'],
      transaction,
    });

    const activePackageIds = activePackages.map((pkg) => pkg.id);

    if (!activePackageIds.length) {
      console.log('⚪ No active packages to sync.');
      return;
    }

    // Step 3: Get package items for this product & size and specific brand (if provided)
    const brandWhere: any = {
      package_id: { [Op.in]: activePackageIds },
    };
    if (brandId) {
      brandWhere.brand_id = brandId;
    }

    const qtyRows = await this.pkgRepo.packageBrandItemsQtyModel.findAll({
      where: { variant_size: size },
      include: [
        {
          model: this.pkgRepo.packageBrandItemsModel,
          as: 'qtyItem', // Ensure strict association alias match
          where: { product_id: product_id },
          include: [
            {
              model: this.pkgRepo.packageBrandModel,
              as: 'brand', // Ensure strict association alias match
              where: brandWhere,
              attributes: ['package_id'],
            },
          ],
        },
      ],
      transaction,
    });

    console.log(`🔍 Found ${qtyRows.length} package items to sync`);

    if (!qtyRows.length) return;

    let itemsSynced = 0;

    for (const qtyRow of qtyRows) {
      const { maxCapacity, selectedCapacity, qtyItem } = qtyRow as any; // Cast if relations not typed
      const { id: itemId, consumerDemand } = qtyItem;

      const newMaxCapacity = Math.max(0, Number(maxCapacity) - soldQty);
      const newSelectedCapacity =
        (Number(selectedCapacity) || 0) > remainingStock ? remainingStock : Number(selectedCapacity) || 0;

      const newConsumerDemand = consumerDemand > remainingStock ? remainingStock : consumerDemand;

      await (qtyRow as any).update(
        {
          maxCapacity: newMaxCapacity,
          selectedCapacity: newSelectedCapacity,
        },
        { transaction },
      );

      await (qtyItem as any).update({ consumerDemand: newConsumerDemand }, { transaction });

      itemsSynced++;
      const packageId = qtyRow.qtyItem?.brand?.package_id || 'unknown';
      console.log(`✅ Synced Package ${packageId}, Item ${itemId}`);
    }

    console.log(`🎯 [reduceSoldQuantityForPackages] COMPLETE: Synced ${itemsSynced} items for ${product_id}-${size}`);
  };
}
