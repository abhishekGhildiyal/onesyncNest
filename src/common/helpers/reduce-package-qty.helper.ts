import { Op, Transaction, Sequelize } from 'sequelize';
import { Variant } from '../../modules/products/entities/variant.entity';
import { PackageBrandItemsQty } from '../../modules/packages/entities/package-brand-item-qty.entity';
import { PackageBrandItems } from '../../modules/packages/entities/package-brand-items.entity';
import { PackageBrand } from '../../modules/packages/entities/package-brand.entity';
import { PackageOrder } from '../../modules/packages/entities/package-order.entity';
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

export const reduceSoldQuantityForPackages = async ({
  productId,
  storeId,
  size,
  soldQty,
  transaction,
  excludeOrderId = undefined,
  brandId = undefined,
}: {
  productId: number;
  storeId: number;
  size: string;
  soldQty: number;
  transaction: Transaction;
  excludeOrderId?: number;
  brandId?: number;
}) => {
  // console.log(`🧩 [reduceSoldQuantityForPackages] Syncing packages...`);

  if (!size) {
    console.warn(
      `⚠️ Variant ${productId} has undefined size, skipping capacity sync.`,
    );
    return;
  }

  // Step 1: Get ACTUAL remaining stock from VariantModel
  const remainingVariantStock = await Variant.sum('quantity', {
    where: {
      productId,
      status: 1,
      [Op.and]: Sequelize.where(
        Sequelize.fn('TRIM', Sequelize.col('option1Value')),
        size,
      ),
    },
    transaction,
  });

  const remainingStock = remainingVariantStock || 0;
  // console.log(`📦 ACTUAL Remaining Stock for (${productId}, ${size}) = ${remainingStock}`);

  // Step 2: Get active packages (excluding current order)
  const whereClause: any = {
    status: { [Op.in]: VALID_ACTIVE_STATUSES },
    store_id: storeId,
  };
  if (excludeOrderId) {
    whereClause.id = { [Op.ne]: excludeOrderId };
  }

  const activePackages = await PackageOrder.findAll({
    where: whereClause,
    attributes: ['id'],
    transaction,
  });

  const activePackageIds = activePackages.map((pkg) => pkg.id);

  if (!activePackageIds.length) {
    // console.log("⚪ No active packages to sync.");
    return;
  }

  // Step 3: Get package items for this product & size and specific brand (if provided)
  const brandWhere: any = {
    package_id: { [Op.in]: activePackageIds },
  };
  if (brandId) {
    brandWhere.brand_id = brandId;
  }

  const qtyRows = await PackageBrandItemsQty.findAll({
    where: { variant_size: size },
    include: [
      {
        model: PackageBrandItems,
        as: 'qtyItem', // Ensure strict association alias match
        where: { product_id: productId },
        include: [
          {
            model: PackageBrand,
            as: 'brand', // Ensure strict association alias match
            where: brandWhere,
            attributes: ['package_id'],
          },
        ],
      },
    ],
    transaction,
  });

  if (!qtyRows.length) return;

  for (const qtyRow of qtyRows) {
    const { maxCapacity, selectedCapacity, qtyItem } = qtyRow as any; // Cast if relations not typed
    const consumerDemand: number = Number(qtyItem.consumerDemand) || 0;

    const newMaxCapacity = Math.max(0, Number(maxCapacity) - soldQty);
    const newSelectedCapacity =
      (Number(selectedCapacity) || 0) > remainingStock ? remainingStock : (Number(selectedCapacity) || 0);
    const newConsumerDemand =
      consumerDemand > remainingStock ? remainingStock : consumerDemand;

    await (qtyRow as any).update(
      {
        maxCapacity: newMaxCapacity,
        selectedCapacity: newSelectedCapacity,
      },
      { transaction },
    );

    await (qtyItem as any).update(
      { consumerDemand: newConsumerDemand },
      { transaction },
    );

    // console.log(`✅ Synced Package ${qtyRow.qtyItem.brand.package_id}, Item ${qtyItem.id}`);
  }
};
