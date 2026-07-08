import { InjectConnection } from '@nestjs/sequelize';
import { Injectable } from '@nestjs/common';
import { Op, Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { BRAND_STATUS, BRAND_TYPE } from 'src/common/constants/enum';
import { ProductRepository } from 'src/db/repository/product.repository';
import { StoreRepository } from 'src/db/repository/store.repository';
import { UserRepository } from 'src/db/repository/user.repository';
import { BarcodeGeneratorHelper } from '../shared/barcode-generator.helper';
import { HandleMetaFieldsHelper } from '../shared/handle-meta-fields.helper';
import { CustomFieldValueAuditHelper } from '../shared/custom-field-value-audit.helper';
import { InventoryActivityLogHelper } from '../update-inventory/inventory-activity-log.helper';
import { InventoryUpdateParityHelper } from '../update-inventory/inventory-update-parity.helper';
import { CloudinaryService } from './cloudinary.service';
import { BulkInventoryAddParityHelper, LABEL_STATUS } from './bulk-inventory-add-parity.helper';
import { isItemLevelStore, resolveStoreSyncType } from 'src/common/helpers/shopify/shopify-sync-utils';

const skuLocks = new Map<string, Promise<void>>();

async function acquireSkuLock(sku: string, storeId: number) {
  const lockKey = `${storeId}::${sku}`;
  while (skuLocks.has(lockKey)) {
    await skuLocks.get(lockKey);
  }
  let resolveLock: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    resolveLock = resolve;
  });
  skuLocks.set(lockKey, lockPromise);
  return () => {
    skuLocks.delete(lockKey);
    resolveLock!();
  };
}

export interface BulkAddUser {
  storeId: number;
  roleId: number;
  userId: number;
  email?: string;
}

@Injectable()
export class BulkInventoryAddCoreHelper {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly storeRepo: StoreRepository,
    private readonly userRepo: UserRepository,
    private readonly parity: BulkInventoryAddParityHelper,
    private readonly cloudinary: CloudinaryService,
    private readonly barcode: BarcodeGeneratorHelper,
    private readonly metaFields: HandleMetaFieldsHelper,
    private readonly customFieldAudit: CustomFieldValueAuditHelper,
    private readonly activityLog: InventoryActivityLogHelper,
    private readonly updateParity: InventoryUpdateParityHelper,
    @InjectConnection() private readonly sequelize: Sequelize,
  ) {}

  async runBulkInventoryAdd(req: { user: BulkAddUser; body: any }) {
    const safeToLower = (val: unknown) => {
      if (val && typeof val === 'string') return val.toLowerCase();
      return '';
    };

    const { storeId, roleId, userId } = req.user;
    const payload = req.body;
    const inventoryItems = Array.isArray(payload) ? payload : [payload];

    const skuSet = new Set<string>();
    for (const inv of inventoryItems) {
      skuSet.add(this.parity.normalizeSku(inv.skuNumber));
    }

    const sortedSkus = [...skuSet].sort();
    const locks: (() => void)[] = [];
    try {
      for (const sku of sortedSkus) {
        locks.push(await acquireSkuLock(sku, storeId));
      }
    } catch (lockErr) {
      locks.forEach((release) => release());
      console.error('Lock acquisition failed:', lockErr);
      return {
        success: false,
        status: 409,
        body: { success: false, message: 'Concurrent update conflict, please retry' },
      };
    }

    const releaseAllLocks = () => locks.forEach((release) => release());
    const t = await this.sequelize.transaction();
    const allProductIds = new Set<number>();
    let totalProductsCreated = 0;
    let totalVariantsCreated = 0;

    const newBrandsToCreate: { brandName: string; store_id: number; type: string; status: string }[] = [];
    const brandMap = new Map<string, number | string>();
    const webInventoriesToCreate: Record<string, unknown>[] = [];
    const globalInventoriesBatch: Record<string, unknown>[] = [];
    const variantBatch: { webBarcode: string; customFields: any[]; variantInfo: Record<string, unknown> }[] = [];
    const templateOptionCache = new Map<string, string[]>();
    const productPrintQueueUpdates = new Map<number, Record<string, unknown>>();

    let totalVariantsCount = 0;
    for (const inv of inventoryItems) {
      const variantList = inv.variant || inv.variants || [];
      for (const v of variantList) totalVariantsCount += parseInt(v.quantity) || 1;
    }

    let currentSequence = await this.barcode.getNextSequenceRange(storeId, totalVariantsCount, t);

    try {
      const store = await this.storeRepo.storeModel.findByPk(storeId, { transaction: t });
      if (!store) throw new Error('Store not found');
      const storeCode = store.store_code || '';
      const storeSyncType = resolveStoreSyncType(store);
      console.log(`[addInventory] store ${storeId} syncType=${storeSyncType} (DB layout is always normal-store)`);

      const storeAccountUsers = await this.userRepo.userModel.findAll({
        where: { firstName: 'Store', lastName: 'Account' },
        attributes: ['id'],
        transaction: t,
      });
      const storeAccountIds = storeAccountUsers.map((u) => u.id);
      const userStoreMappings = await this.userRepo.userStoreMappingModel.findAll({
        where: { userId: { [Op.in]: storeAccountIds }, storeId },
        attributes: ['userId'],
        transaction: t,
      });
      const storeAccountUserId = userStoreMappings.length ? userStoreMappings[0].userId : null;
      const effectiveStoreAccountId = storeAccountUserId || userId;

      const userCache = new Map<number, any>();
      const getUserById = async (id: number) => {
        if (!id) return null;
        if (userCache.has(id)) return userCache.get(id);
        const user = await this.userRepo.userModel.findByPk(id, { transaction: t });
        if (user) userCache.set(id, user);
        return user;
      };

      const userIdsToPrefetch = new Set<number>();
      for (const inv of inventoryItems) {
        if (inv.consignerUser?.id) userIdsToPrefetch.add(inv.consignerUser.id);
        if (inv.ownerData?.id) userIdsToPrefetch.add(inv.ownerData.id);
        const variantList = inv.variant || inv.variants || [];
        for (const variant of variantList) {
          if (variant.consignerUser?.id) userIdsToPrefetch.add(variant.consignerUser.id);
          if (variant.ownerData?.id) userIdsToPrefetch.add(variant.ownerData.id);
        }
      }
      if (userIdsToPrefetch.size) {
        const prefetchedUsers = await this.userRepo.userModel.findAll({
          where: { id: { [Op.in]: [...userIdsToPrefetch] } },
          transaction: t,
        });
        prefetchedUsers.forEach((user) => userCache.set(user.id, user));
      }

      const locationIdCache = new Map<string, number | null>();
      const getLocationId = async (locationName: string) => {
        if (!locationName) return null;
        if (locationIdCache.has(locationName)) return locationIdCache.get(locationName)!;
        const locationId = await this.parity.resolveLocationId(locationName, storeId, t);
        locationIdCache.set(locationName, locationId);
        return locationId;
      };

      const allBrandNames = [...new Set(inventoryItems.map((i) => i.brand?.trim()).filter(Boolean))];
      if (allBrandNames.length) {
        const existingBrands = await this.productRepo.brandModel.findAll({
          where: {
            store_id: storeId,
            [Op.and]: this.sequelize.where(this.sequelize.fn('LOWER', this.sequelize.col('brand_name')), {
              [Op.in]: allBrandNames.map((n) => safeToLower(n)),
            }),
          },
          order: [['id', 'ASC']],
          transaction: t,
        });
        existingBrands.forEach((b) => {
          const name = (b as any).brandName || (b as any).brand_name;
          if (!name) return;
          const lower = safeToLower(name);
          if (!brandMap.has(lower)) brandMap.set(lower, b.id);
        });
      }

      for (const inv of inventoryItems) {
        const skuNumber = this.parity.normalizeSku(inv.skuNumber);
        const brandName = inv.brand?.trim();

        if (inv.consignerUser?.id) {
          const consigner = await getUserById(inv.consignerUser.id);
          if (consigner) inv._resolvedConsignerUser = consigner;
        }

        let brandId: number | string | null = null;
        if (brandName) {
          const lowerBrand = safeToLower(brandName);
          if (brandMap.has(lowerBrand)) {
            brandId = brandMap.get(lowerBrand)!;
          } else {
            newBrandsToCreate.push({
              brandName,
              store_id: storeId,
              type: BRAND_TYPE.PUBLIC || 'Public',
              status: BRAND_STATUS.ACTIVE || 'Active',
            });
            brandId = `__BRAND_NEW_${lowerBrand}`;
            brandMap.set(lowerBrand, brandId);
          }
        }

        let existingProduct = await this.productRepo.productListModel.findOne({
          where: { skuNumber, storeId },
          transaction: t,
        });

        const resolvedCategory = String(inv.category || existingProduct?.category || '').trim();
        let template: any = null;
        let templateOptionKeys: string[] = [];
        if (resolvedCategory) {
          try {
            template = await this.productRepo.templateModel.findByPk(resolvedCategory, { transaction: t });
            if (template) {
              if (!templateOptionCache.has(resolvedCategory)) {
                templateOptionCache.set(
                  resolvedCategory,
                  await this.parity.loadTemplateOptionKeys(resolvedCategory, t),
                );
              }
              templateOptionKeys = templateOptionCache.get(resolvedCategory) || [];
            }
          } catch {
            console.warn('Invalid category:', resolvedCategory);
          }
        }

        const resolvedTemplateName = inv.template || template?.name || existingProduct?.template || 'Unknown';
        const variantList = inv.variant || inv.variants || [];
        const itemName = String(inv.itemName || '').trim();
        const description = String(inv.description || '').trim();
        const hasLinkedVariants = variantList.some((v: any) => !v.linkedImage);

        let savedProduct = existingProduct;
        if (!existingProduct) {
          const normalizedImage = await this.cloudinary.normalizeProductImages(inv.image || '');
          savedProduct = await this.productRepo.productListModel.create(
            {
              brand: inv.brand,
              brand_id: typeof brandId === 'number' ? brandId : null,
              color: inv.color,
              image: normalizedImage,
              itemName,
              skuNumber,
              handle: itemName,
              storeId,
              isStoreOnly: inv.storeOnly || false,
              stock: 0,
              sold: 0,
              needApproval: 0,
              category: resolvedCategory,
              template: resolvedTemplateName,
              type: inv.type,
              description,
              stockXStyleId: inv.stockXStyleId || null,
              stockXSizeChart: inv.stockXSizeChart || null,
              labelStatus: LABEL_STATUS.NOT_PRINTED,
            } as any,
            { transaction: t },
          );
          totalProductsCreated++;

          if (inv.customFields?.length) {
            const newProductId = savedProduct.product_id;
            await this.parity.saveProductCustomFields({
              customFields: inv.customFields,
              productId: newProductId,
              storeId,
              transaction: t,
            });
          }
        } else if (existingProduct.isStoreOnly !== !!inv.storeOnly) {
          await existingProduct.update({ isStoreOnly: !!inv.storeOnly }, { transaction: t });
        }

        const productId = savedProduct!.product_id;
        allProductIds.add(productId);

        const parsedProductWeight = parseFloat(inv.weight);
        if (Number.isFinite(parsedProductWeight) && parsedProductWeight >= 0) {
          await this.productRepo.variantModel.update(
            { weight: parsedProductWeight },
            { where: { productId, storeId }, transaction: t },
          );
        }

        const existingCatalogWebInventory = await this.productRepo.inventoryModel.findOne({
          where: { skuNumber, storeId, publishedScope: 'web', linkedImage: false },
          transaction: t,
        });

        const isAccepted = this.parity.isWebInventoryAccepted(roleId, variantList);
        const inventoryOwnerId =
          inv._resolvedConsignerUser?.id || inv.ownerData?.id || inv.consignerUser?.id || userId;

        if (!existingCatalogWebInventory && hasLinkedVariants && !isItemLevelStore(store)) {
          webInventoriesToCreate.push({
            accountType: 1,
            brand: inv.brand,
            color: inv.color,
            displayName: itemName,
            image: savedProduct!.image,
            itemName,
            publishedScope: 'web',
            skuNumber,
            storeId,
            user_id: inventoryOwnerId,
            productId: productId,
            webBarcode: null,
            category: resolvedCategory,
            template: resolvedTemplateName,
            type: savedProduct!.type,
            isVisible: true,
            acceptedOn: isAccepted ? new Date() : null,
            linkedImage: false,
            auctionEnabled: inv.auctionEnabled || false,
          });
        } else if (existingCatalogWebInventory && existingCatalogWebInventory.auctionEnabled !== !!inv.auctionEnabled) {
          await existingCatalogWebInventory.update({ auctionEnabled: !!inv.auctionEnabled }, { transaction: t });
        }

        for (const variant of variantList) {
          const quantity = parseInt(variant.quantity) || 1;
          let varUser =
            variant.ownerData || variant.consignerUser || inv.ownerData || inv.consignerUser || {
              id: effectiveStoreAccountId,
            };

          if (variant.consignerUser?.id) {
            const variantConsigner = await getUserById(variant.consignerUser.id);
            if (variantConsigner) varUser = variantConsigner;
          } else if (inv._resolvedConsignerUser) {
            varUser = inv._resolvedConsignerUser;
          }

          let isStoreAccount = false;
          if (varUser.id) {
            const userRec = await getUserById(varUser.id);
            if (userRec) {
              const fullName = `${userRec.firstName || ''} ${userRec.lastName || ''}`.trim().toLowerCase();
              isStoreAccount = fullName === 'store account';
            } else {
              isStoreAccount = true;
            }
          } else {
            isStoreAccount = true;
          }

          const accountType = isStoreAccount ? 1 : 0;
          let price = parseFloat(variant.price) || 0;
          const cost = parseFloat(variant.cost) || 0;
          let payout = accountType === 1 ? 0 : parseFloat(variant.payout) || 0;
          if (inv.auctionEnabled) {
            price = 0;
            payout = 0;
          }
          const fee = accountType === 1 ? 0 : parseFloat(variant.fee) || 0;
          const variantWeight = parseFloat(variant.weight);
          const productWeight = parseFloat(inv.weight);
          const templateWeight = template ? parseFloat(String(template.weight)) : NaN;
          const weight = Number.isFinite(variantWeight)
            ? variantWeight
            : Number.isFinite(productWeight)
              ? productWeight
              : Number.isFinite(templateWeight)
                ? templateWeight
                : 1.0;
          const compareAtPrice = variant.compareAtPrice || variant.compare_at_price || null;
          const variantStatus = variant.status ?? 4;
          const templateOptions = this.parity.buildTemplateOptionFields(templateOptionKeys, variant);
          const resolvedLocation = this.parity.resolveVariantLocation({
            auctionEnabled: inv.auctionEnabled || false,
            accountType,
            variantLocation: variant.location || null,
          });
          const resolvedLocationId = variant.location_id || (await getLocationId(resolvedLocation || ''));
          const createdOn = new Date();
          const { globalFields: printQueueFields, productUpdate } = this.parity.applyAddPrintQueueRules({
            product: savedProduct!,
            variantStatus,
          });
          if (productUpdate) productPrintQueueUpdates.set(productId, productUpdate);

          for (let i = 0; i < quantity; i++) {
            const nextId = currentSequence++;
            const customVariantId = `${storeCode}${nextId}`;
            const webBarcode = this.barcode.generateUniqueId(10);
            const variantItemName =
              variant.linkedImage && variant.customItemName?.trim()
                ? variant.customItemName.trim()
                : itemName;
            const uniqueVariantImages =
              variant.linkedImage && variant.variantImage && String(variant.variantImage).trim()
                ? String(variant.variantImage).trim()
                : savedProduct!.image;

            globalInventoriesBatch.push({
              accountType,
              brand: inv.brand,
              color: inv.color,
              displayName: `${customVariantId} ${variantItemName || ''}`,
              image: variant.linkedImage ? uniqueVariantImages : savedProduct!.image,
              itemName: variantItemName,
              publishedScope: 'global',
              skuNumber,
              storeId,
              user_id: varUser.id || effectiveStoreAccountId,
              productId: productId,
              webBarcode,
              category: resolvedCategory,
              template: resolvedTemplateName,
              type: savedProduct!.type,
              isVisible: true,
              acceptedOn: this.parity.isGlobalInventoryAccepted(roleId, variantStatus) ? createdOn : null,
              linkedImage: !!variant.linkedImage,
              auctionEnabled: inv.auctionEnabled || false,
              ...printQueueFields,
            });

            variantBatch.push({
              webBarcode,
              customFields: variant.customFields || [],
              variantInfo: {
                accountType,
                productId: productId,
                barcode: customVariantId,
                custom_variant_id: customVariantId,
                location: resolvedLocation,
                location_id: resolvedLocationId,
                storeLocationMappingId: variant.storeLocationMappingId || null,
                ...templateOptions,
                original_quantity: 1,
                quantity: 1,
                status: variantStatus,
                store_id: storeId,
                user_id: varUser.id || effectiveStoreAccountId,
                price,
                cost,
                payout,
                fee,
                weight,
                web_barcode: webBarcode,
                accepted_on: createdOn,
                purchase_date: variant.purchaseDate || variant.purchase_date || null,
                vendorOrderNo: variant.vendorOrderNo || variant.vendor_order_no || null,
                purchase_from_vendor:
                  variant.purchaseFromVendor || variant.vendorName || variant.purchase_from_vendor || null,
                payment_form: variant.paymentForm || variant.payment_form || null,
                note: variant.note || null,
                itemTags: variant.itemTags || variant.item_tags || null,
                linkedImage: !!variant.linkedImage,
                variantImage:
                  variant.linkedImage && variant.variantImage
                    ? String(variant.variantImage).trim() || null
                    : null,
                compare_at_price: compareAtPrice,
                localOrderNo: variant.localOrderNo || variant.local_order_no || null,
              },
            });
          }
        }
      }

      for (const [pid, update] of productPrintQueueUpdates) {
        await this.productRepo.productListModel.update(update, {
          where: { product_id: pid, storeId },
          transaction: t,
        });
      }

      if (newBrandsToCreate.length) {
        const createdBrands = await this.productRepo.brandModel.bulkCreate(newBrandsToCreate as any, {
          transaction: t,
          returning: true,
        });
        for (let i = 0; i < newBrandsToCreate.length; i++) {
          const brandNameValue = newBrandsToCreate[i].brandName;
          if (!brandNameValue) continue;
          const lower = safeToLower(brandNameValue);
          const realId = createdBrands[i]?.id;
          if (realId) brandMap.set(lower, realId);
        }
      }

      if (webInventoriesToCreate.length) {
        await this.productRepo.inventoryModel.bulkCreate(webInventoriesToCreate as any, { transaction: t });
      }

      let createdGlobals: any[] = [];
      if (globalInventoriesBatch.length) {
        createdGlobals = await this.productRepo.inventoryModel.bulkCreate(globalInventoriesBatch as any, {
          transaction: t,
          returning: true,
        });
        totalVariantsCreated = createdGlobals.length;
      }

      const barcodeToIdMap = new Map<string, number>();
      if (createdGlobals.length) {
        createdGlobals.forEach((g) => {
          if (g.id && g.webBarcode) barcodeToIdMap.set(g.webBarcode, g.id);
        });
        if (barcodeToIdMap.size !== createdGlobals.length) {
          const barcodes = createdGlobals.map((g) => g.webBarcode);
          const fetched = await this.productRepo.inventoryModel.findAll({
            where: { webBarcode: { [Op.in]: barcodes }, storeId },
            attributes: ['id', 'webBarcode'],
            transaction: t,
          });
          fetched.forEach((f) => barcodeToIdMap.set(f.webBarcode!, f.id));
        }
      }

      if (variantBatch.length) {
        const variantsWithInventoryId = variantBatch.map((v) => ({
          ...v.variantInfo,
          inventoryId: barcodeToIdMap.get(v.webBarcode),
        }));
        const createdVariants = await this.productRepo.variantModel.bulkCreate(variantsWithInventoryId as any, {
          transaction: t,
          returning: true,
        });
        const auditUsername = req.user?.email || String(req.user?.userId || 'SYSTEM');
        const revision = await this.customFieldAudit.createCustomFieldRevision(t, auditUsername);

        await Promise.all(
          createdVariants.map((createdVariant, i) =>
            this.metaFields.handleCustomMetaFields({
              customFields: variantBatch[i].customFields,
              storeId,
              variantId: createdVariant.id,
              transaction: t,
              rev: revision,
            }),
          ),
        );
      }

      const paymentFormsToRegister = new Set<string>();
      for (const variantEntry of variantBatch) {
        const paymentForm = String(variantEntry.variantInfo?.payment_form || '').trim();
        if (paymentForm) paymentFormsToRegister.add(paymentForm);
      }
      await Promise.all(
        [...paymentFormsToRegister].map((paymentForm) =>
          this.updateParity.ensurePaymentFormRegistered(paymentForm, storeId, t),
        ),
      );

      await t.commit();
      releaseAllLocks();
      console.log('Bulk transaction committed successfully.');

      this.activityLog.recordInventoryCreateBatch(createdGlobals, req.user?.userId).catch((activityError) => {
        console.error('[activityLog] bulk add CREATE batch failed', activityError);
      });

      return {
        success: true,
        storeId,
        productIds: [...allProductIds].filter((id) => id && typeof id === 'number'),
        productsCreated: totalProductsCreated,
        variantsCreated: totalVariantsCreated,
        itemCount: inventoryItems.length,
      };
    } catch (err: any) {
      if (t && (t as any).finished !== 'commit') await t.rollback();
      releaseAllLocks();
      console.error('Bulk addInventory error:', err);
      return {
        success: false,
        status: 500,
        body: { success: false, message: 'Failed to add inventory', error: err.message },
      };
    }
  }
}
