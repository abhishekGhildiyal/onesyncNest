import { InjectConnection } from '@nestjs/sequelize';
import { Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { BRAND_STATUS, BRAND_TYPE } from 'src/common/constants/enum';
import { ProductRepository } from 'src/db/repository/product.repository';
import { StoreRepository } from 'src/db/repository/store.repository';
import { UserRepository } from 'src/db/repository/user.repository';
import { BarcodeGeneratorHelper } from '../shared/barcode-generator.helper';
import { InventoryActivityLogHelper } from '../update-inventory/inventory-activity-log.helper';
import { BulkInventoryAddParityHelper } from './bulk-inventory-add-parity.helper';

@Injectable()
export class AddInventoryCtoSHelper {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly storeRepo: StoreRepository,
    private readonly userRepo: UserRepository,
    private readonly barcode: BarcodeGeneratorHelper,
    private readonly parity: BulkInventoryAddParityHelper,
    private readonly activityLog: InventoryActivityLogHelper,
    @InjectConnection() private readonly sequelize: Sequelize,
  ) {}

  async addInventoryCtoS(data: any, storeId: number, userId: number) {
    const t = await this.sequelize.transaction();

    try {
      const products = Array.isArray(data) ? data : data ? [data] : [];
      if (products.length === 0) return true;

      const store = await this.storeRepo.storeModel.findOne({
        where: { store_id: storeId },
        transaction: t,
      });

      const storeCode = store?.store_code || '';

      const storeAccountUsers = await this.userRepo.userModel.findAll({
        where: { firstName: 'Store', lastName: 'Account' },
        attributes: ['id'],
        transaction: t,
      });

      const storeAccountIds = storeAccountUsers.map((u) => u.id);
      const storeAccountMapping = await this.userRepo.userStoreMappingModel.findOne({
        where: { userId: { [Op.in]: storeAccountIds }, storeId },
        transaction: t,
      });

      const storeAccountUserId = storeAccountMapping?.userId || userId;

      const brandNames = [...new Set(products.map((p) => p.brand).filter(Boolean))];
      const existingBrands = await this.productRepo.brandModel.findAll({
        where: {
          [Op.and]: [
            this.sequelize.where(this.sequelize.fn('LOWER', this.sequelize.col('brand_name')), {
              [Op.in]: brandNames.map((b) => b.toLowerCase()),
            }),
            { store_id: storeId },
          ],
        },
        transaction: t,
      });

      const brandMap = new Map<string, number>();
      existingBrands.forEach((b) => brandMap.set((b as any).brandName.toLowerCase(), b.id));

      for (const brandName of brandNames) {
        if (!brandMap.has(brandName.toLowerCase())) {
          const newBrand = await this.productRepo.brandModel.create(
            {
              brandName,
              store_id: storeId,
              status: BRAND_STATUS.ACTIVE,
              type: BRAND_TYPE.PUBLIC,
            } as any,
            { transaction: t },
          );
          brandMap.set(brandName.toLowerCase(), newBrand.id);
        }
      }

      const skuNumbers = products.map((p) => p.skuNumber).filter(Boolean);
      const existingProducts = await this.productRepo.productListModel.findAll({
        where: { skuNumber: skuNumbers, storeId },
        transaction: t,
      });

      const productMap = new Map<string, number>();
      existingProducts.forEach((p) => productMap.set(p.skuNumber, p.product_id));

      for (const prod of products) {
        if (!productMap.has(prod.skuNumber)) {
          const brandId = brandMap.get(prod.brand?.toLowerCase());
          const newProduct = await this.productRepo.productListModel.create(
            {
              brand: prod.brand,
              brand_id: brandId,
              color: prod?.color,
              image: prod?.image,
              itemName: prod?.itemName,
              skuNumber: prod?.skuNumber,
              handle: prod?.handle ?? prod?.itemName,
              storeId,
              isStoreOnly: prod?.isStoreOnly,
              description: prod?.description,
              sold: 0,
              needApproval: 0,
              category: '',
              template: '',
              stockXStyleId: prod?.stockXStyleId || null,
              stockXSizeChart: prod?.stockXSizeChart || null,
            } as any,
            { transaction: t },
          );
          productMap.set(prod.skuNumber, newProduct.product_id);
        }
      }

      const existingWebInventories = await this.productRepo.inventoryModel.findAll({
        where: { skuNumber: skuNumbers, storeId, publishedScope: 'web' },
        transaction: t,
      });

      const webInventoryMap = new Map<string, number>();
      existingWebInventories.forEach((inv) => webInventoryMap.set(inv.skuNumber!, inv.id));

      let totalGlobalQty = 0;
      products.forEach((p) => {
        (p.variant || []).forEach((v: any) => {
          totalGlobalQty += parseInt(v.quantity) || 1;
        });
      });

      let currentSequence = await this.barcode.getNextSequenceRange(storeId, totalGlobalQty, t);
      const inventoriesToCreate: Record<string, unknown>[] = [];
      const variantBuffer: { webBarcode: string; variantInfo: Record<string, unknown> }[] = [];

      for (const prod of products) {
        const productId = productMap.get(prod.skuNumber)!;
        let webInventoryId = webInventoryMap.get(prod.skuNumber);

        if (!webInventoryId) {
          const webInv = await this.productRepo.inventoryModel.create(
            {
              accountType: 1,
              brand: prod.brand,
              color: prod?.color,
              displayName: prod?.itemName,
              image: prod?.image,
              itemName: prod?.itemName,
              publishedScope: 'web',
              skuNumber: prod?.skuNumber,
              storeId,
              user_id: userId,
              product_id: productId,
              webBarcode: null,
            } as any,
            { transaction: t },
          );
          webInventoryId = webInv.id;
          webInventoryMap.set(prod.skuNumber, webInventoryId);
        }

        for (const variant of prod.variant || []) {
          const quantity = parseInt(variant.quantity) || 1;

          for (let i = 0; i < quantity; i++) {
            const nextId = currentSequence++;
            const customVariantId = `${storeCode}${nextId}`;
            const webBarcode = this.barcode.generateUniqueId(10);

            inventoriesToCreate.push({
              accountType: 1,
              brand: prod.brand,
              color: prod?.color,
              displayName: customVariantId + ' ' + (prod?.itemName || ''),
              image: prod?.image,
              itemName: prod?.itemName,
              publishedScope: 'global',
              skuNumber: prod.skuNumber,
              storeId,
              user_id: storeAccountUserId,
              product_id: productId,
              webBarcode,
            });

            variantBuffer.push({
              webBarcode,
              variantInfo: {
                accountType: 1,
                barcode: customVariantId,
                custom_variant_id: customVariantId,
                location: variant.location,
                location_id: variant.location_id,
                option1: variant.option1,
                option1Value: this.parity.resolveVariantOptionValue(variant, 'option1Value'),
                option2: variant.option2,
                option2Value: this.parity.resolveVariantOptionValue(variant, 'option2Value'),
                option3: variant.option3,
                option3Value: this.parity.resolveVariantOptionValue(variant, 'option3Value'),
                original_quantity: 1,
                price: 0,
                product_id: productId,
                quantity: 1,
                status: 4,
                store_id: storeId,
                user_id: storeAccountUserId,
                cost: variant.price,
                payout: 0,
                fee: 0,
                web_barcode: webBarcode,
                weight: 0,
              },
            });
          }
        }
      }

      const createdInventories = await this.productRepo.inventoryModel.bulkCreate(inventoriesToCreate as any, {
        returning: true,
        transaction: t,
      });

      const inventoryMap = new Map<string, number>();
      createdInventories.forEach((inv) => {
        if (inv.webBarcode) inventoryMap.set(inv.webBarcode, inv.id);
      });

      const variantsToCreate = variantBuffer.map((v) => ({
        ...v.variantInfo,
        inventoryId: inventoryMap.get(v.webBarcode),
      }));

      if (variantsToCreate.length) {
        await this.productRepo.variantModel.bulkCreate(variantsToCreate as any, { transaction: t });
      }

      await t.commit();

      try {
        const globalCreated = createdInventories.filter(
          (inv) => String(inv.publishedScope || (inv as any).published_scope) === 'global',
        );
        await this.activityLog.recordInventoryCreateBatch(globalCreated, userId);
      } catch (activityError: any) {
        console.error('❌ [activityLog] Failed to record CtoS create logs:', activityError.message);
      }

      return true;
    } catch (error) {
      await t.rollback();
      console.error('addInventoryCtoS error:', error);
      throw error;
    }
  }
}
