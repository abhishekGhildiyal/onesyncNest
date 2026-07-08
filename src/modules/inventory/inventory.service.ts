import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/sequelize';
import { Op, Sequelize } from 'sequelize';
import { Sequelize as SequelizeTS } from 'sequelize-typescript';
import { PACKAGE_STATUS } from 'src/common/constants/enum';
import { AddInventoryCtoSHelper } from 'src/common/helpers/create-inventory/add-inventory-cto-s.helper';
import { BulkInventoryAddCoreHelper } from 'src/common/helpers/create-inventory/bulk-inventory-add-core.helper';
import { MarkInventorySold } from 'src/common/helpers/sold-inventory.helper';
import { PersistShopifyVariantIdsHelper } from 'src/common/helpers/shopify/persist-shopify-variant-ids.helper';
import { ShopifyInventorySyncHelper } from 'src/common/helpers/shopify/shopify-inventory-sync.helper';
import { UniqueProductStoreShopifyHelper } from 'src/common/helpers/shopify/unique-product-store-shopify.helper';
import { InventoryUpdateCoreHelper } from 'src/common/helpers/update-inventory/inventory-update-core.helper';
import type { getUser } from 'src/common/interfaces/common/getUser';
import { TagSource, User } from 'src/db/entities';
import { PackageRepository } from 'src/db/repository/package.repository';
import { ProductRepository } from 'src/db/repository/product.repository';
import { StoreRepository } from 'src/db/repository/store.repository';
import { runStoreSync } from 'src/common/helpers/shopify/store-sync';
import { ShopifyServiceFactory } from 'src/modules/shopify/shopify.service';
import { processBulkUpdateDb } from 'src/queues/inventory-bulk-update.processor';
import type { InventoryBulkUpdateItemPayload } from 'src/queues/inventory-bulk-update.types';
import { AllMessages } from '../../common/constants/messages';
import * as DTO from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly pkgRepo: PackageRepository,
    private readonly productRepo: ProductRepository,
    private readonly storeRepo: StoreRepository,
    private readonly bulkAdd: BulkInventoryAddCoreHelper,
    private readonly updateCore: InventoryUpdateCoreHelper,
    private readonly addCtoS: AddInventoryCtoSHelper,
    private readonly markSold: MarkInventorySold,
    private readonly shopifySync: ShopifyInventorySyncHelper,
    private readonly uniqueProduct: UniqueProductStoreShopifyHelper,
    private readonly persistVariantIds: PersistShopifyVariantIdsHelper,
    private readonly shopifyFactory: ShopifyServiceFactory,
    @InjectConnection() private readonly sequelize: SequelizeTS,
  ) {}

  /**
   * @description fetch consumer Products with variant total
   */
  async getAllInventory(user: getUser, body: DTO.GetAllInventoryDto) {
    const { userId } = user;
    const { page = 1, limit = 10, search, productType, size, sort = 'newest', brand } = body;

    try {
      const Nlimit = parseInt(String(limit), 10);
      const offset = (parseInt(String(page), 10) - 1) * Nlimit;

      const whereClause: any = { consumerId: userId };

      if (size) {
        whereClause.size = size;
      }

      if (productType) {
        whereClause.type = productType;
      }

      let order: any = [['createdAt', 'DESC']];
      const sortValue = sort.toLowerCase() || 'newest';

      if (sortValue) {
        switch (sortValue) {
          case 'newest':
            order = [['createdAt', 'DESC']];
            break;
          case 'oldest':
            order = [['createdAt', 'ASC']];
            break;
          case 'name_asc':
            order = [[{ model: this.pkgRepo.consumerProductModel, as: 'product' }, 'itemName', 'ASC']];
            break;
          case 'name_desc':
            order = [[{ model: this.pkgRepo.consumerProductModel, as: 'product' }, 'itemName', 'DESC']];
            break;
          default:
            order = order;
        }
      }

      const includeClause: any[] = [
        {
          model: this.pkgRepo.consumerProductModel,
          as: 'product',
          attributes: ['skuNumber', 'itemName', 'image', 'brand_id', 'product_id'],
          where: {},
        },
      ];

      if (search) {
        includeClause[0].where.itemName = { [Op.like]: `%${search}%` };
      }
      if (brand) {
        includeClause[0].where.brand_id = brand;
      }

      const { rows: variantList, count: total } = await this.pkgRepo.consumerInventoryModel.findAndCountAll({
        where: whereClause,
        limit: Nlimit,
        offset,
        order,
        include: includeClause,
      });

      return {
        message: '',
        data: variantList,
        pagination: {
          total,
          totalPages: Math.ceil(total / Nlimit),
          currentPage: parseInt(String(page)),
        },
      };
    } catch (err) {
      console.log('getAllInventory err', err);
      throw new BadRequestException({
        success: false,
        message: AllMessages.SMTHG_WRNG,
      });
    }
  }

  /**
   * @description consumerProducts with stock count
   */
  async consumerProducts(user: getUser, body: DTO.ConsumerProductsDto) {
    try {
      const { userId } = user;
      const { page = 1, limit = 10 } = body;

      const consumerProductMappings = await this.pkgRepo.consumerProductsMappingModel.findAll({
        where: { consumerId: userId },
        attributes: ['productId'],
        raw: true,
      });

      const productIds = consumerProductMappings.map((m: any) => m.productId);

      if (productIds.length === 0) {
        return {
          success: true,
          data: [],
          pagination: {
            total: 0,
            totalPages: 0,
            currentPage: parseInt(String(page), 10),
          },
        };
      }

      const Nlimit = parseInt(String(limit), 10);
      const offset = (parseInt(String(page), 10) - 1) * Nlimit;

      const { rows: products, count: total } = await this.pkgRepo.consumerProductModel.findAndCountAll({
        where: { product_id: { [Op.in]: productIds } },
        limit: Nlimit,
        offset,
        order: [['updatedAt', 'DESC']],
        raw: true,
      });

      const consumerProductIds = products.map((p: any) => p.product_id);

      const stockCounts = await this.pkgRepo.consumerProductVariantModel.findAll({
        where: { productId: { [Op.in]: consumerProductIds } },
        attributes: ['productId', [Sequelize.fn('COUNT', Sequelize.col('id')), 'stockCount']],
        group: ['productId'],
        raw: true,
      });

      const stockMap = stockCounts.reduce((acc: any, item: any) => {
        acc[item.productId] = item.stockCount;
        return acc;
      }, {});

      const productsWithStock = products.map((p: any) => ({
        ...p,
        stockCount: stockMap[p.product_id] || 0,
      }));

      return {
        success: true,
        data: productsWithStock,
        pagination: {
          total,
          totalPages: Math.ceil(total / Nlimit),
          currentPage: parseInt(String(page), 10),
        },
      };
    } catch (err) {
      console.error('consumerProducts error:', err);
      throw new BadRequestException({
        success: false,
        message: AllMessages.SMTHG_WRNG,
      });
    }
  }

  /**
   * @description Variant ( size: total ) detail view
   */
  async productVariants(body: DTO.ProductVariantsDto) {
    const { productId } = body;
    try {
      const detail = await this.pkgRepo.consumerProductModel.findOne({
        where: { product_id: productId },
        include: [
          {
            model: this.pkgRepo.consumerProductVariantModel,
            as: 'variants',
          },
        ],
      });

      return {
        success: true,
        data: detail,
      };
    } catch (err) {
      console.log('productVariants err', err);
      throw new BadRequestException({
        success: false,
        message: AllMessages.SMTHG_WRNG,
      });
    }
  }

  /**
   * @description brands of user inventory for filter
   */
  async inventoryBrands(user: getUser) {
    try {
      const { userId } = user;
      const productMappings = await this.pkgRepo.consumerProductsMappingModel.findAll({
        where: { consumerId: userId },
        attributes: ['productId'],
        raw: true,
      });
      const productIds = productMappings.map((m: any) => m.productId);

      const productBrands = await this.pkgRepo.consumerProductModel.findAll({
        where: { product_id: { [Op.in]: productIds } },
        attributes: ['brand', 'brand_id'],
        raw: true,
      });

      const uniqueBrands = [
        ...new Map(productBrands.map((b: any) => [b.brand_id, { brand_id: b.brand_id, brand: b.brand }])).values(),
      ];

      return {
        success: true,
        data: uniqueBrands,
      };
    } catch (err) {
      console.log('invenoryBrands err', err);
      throw new BadRequestException({
        success: false,
        message: AllMessages.SMTHG_WRNG,
      });
    }
  }

  /**
   * @description hyperAdd inventory Quickly Add/Remove quantity from chart.
   */
  async hyperAddinventory(body: DTO.HyperAddInventoryDto) {
    if (!body.productId || !body.size || !body.action) {
      throw new BadRequestException({
        success: false,
        message: 'Missing required fields: productId, size, action.',
      });
    }

    const Ncount = parseInt(String(body.count)) || 0;
    if (Ncount <= 0) {
      throw new BadRequestException({
        success: false,
        message: '`count` must be a positive integer.',
      });
    }

    if (!this.sequelize) {
      throw new BadRequestException({
        success: false,
        message: 'Sequelize instance not found',
      });
    }

    const t = await this.sequelize.transaction();
    try {
      const { productId, size, action, count = 1 } = body;

      const allActiveVariants = await this.productRepo.variantModel.findAll({
        where: { productId: productId, status: 1 },
        transaction: t,
      });

      const product = await this.productRepo.productListModel.findByPk(productId, {
        transaction: t,
      });

      if (!allActiveVariants.length) {
        await t.rollback();
        throw new NotFoundException({
          success: false,
          message: 'No active variants found for this product.',
        });
      }

      const originalVariant = await this.productRepo.variantModel.findOne({
        where: { productId: productId, option1Value: size, status: 1 },
        order: [['created_on', 'DESC']],
        transaction: t,
      });

      const calcAvg = (field: string) =>
        allActiveVariants.reduce((sum, v: any) => sum + (Number(v[field]) || 0), 0) / allActiveVariants.length;

      const findMostUsedLocation = () => {
        const counts: any = {};
        for (const v of allActiveVariants) {
          if (!(v as any).location) continue;
          counts[(v as any).location] = (counts[(v as any).location] || 0) + 1;
        }
        return Object.entries(counts).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || null;
      };

      if (action === 'add') {
        const priceToUse = originalVariant?.price || calcAvg('price');
        const costToUse = originalVariant?.cost || calcAvg('cost');
        const locationToUse = originalVariant?.location || findMostUsedLocation();

        const newVariants: any[] = [];

        for (let i = 0; i < count; i++) {
          const inventory = await this.productRepo.inventoryModel.create(
            {
              skuNumber: product?.skuNumber,
              itemName: product?.itemName,
              displayName: product?.itemName,
              category: product?.category,
              color: product?.color,
              storeId: originalVariant?.store_id,
              productId: productId,
              brand: product?.brand,
              template: product?.template,
              type: product?.type,
              image: product?.image,
              accountType: originalVariant?.accountType,
              user_id: originalVariant?.user_id,
              publishedScope: 'global',
            },
            { transaction: t },
          );

          const variantData: any = originalVariant ? originalVariant.get({ plain: true }) : {};
          const {
            id: _id,
            created_on: _co,
            updated_on: _uo,
            barcode: _bc,
            custom_variant_id: _cvi,
            barcode_numeric: _bn,
            web_barcode: _wb,
            ...cleanVariant
          } = variantData;

          newVariants.push({
            ...cleanVariant,
            option1: originalVariant?.option1 || 'Size',
            option1Value: size,
            productId: productId,
            store_id: originalVariant?.store_id,
            price: priceToUse,
            cost: costToUse,
            location: locationToUse,
            quantity: 1,
            status: 1,
            inventoryId: inventory.id,
            user_id: originalVariant?.user_id,
            weight: originalVariant?.weight,
          });
        }

        await this.productRepo.variantModel.bulkCreate(newVariants, { transaction: t });
        await t.commit();

        return {
          success: true,
          message: `${count} new ${size} inventory + variant(s) added.`,
        };
      }

      if (action === 'remove') {
        const variantsToRemove = await this.productRepo.variantModel.findAll({
          where: { productId: productId, option1Value: size, status: 1 },
          order: [['created_on', 'DESC']],
          limit: count,
          transaction: t,
        });

        if (!variantsToRemove.length) {
          await t.rollback();
          throw new NotFoundException({
            success: false,
            message: `No active ${size} variants found to remove.`,
          });
        }

        const variantIds = variantsToRemove.map((v: any) => v.id);
        const inventoryIds = variantsToRemove.map((v: any) => v.inventoryId);

        await this.productRepo.variantModel.update({ status: 0 }, { where: { id: variantIds }, transaction: t });
        await this.productRepo.inventoryModel.update(
          { isVisible: false },
          { where: { id: inventoryIds }, transaction: t },
        );

        await t.commit();
        return {
          success: true,
          message: `${variantsToRemove.length} ${size} item(s) moved to trash.`,
        };
      }

      await t.rollback();
      throw new BadRequestException({
        success: false,
        message: "Invalid action. Use 'add' or 'remove'.",
      });
    } catch (err: any) {
      if (t) await t.rollback();
      console.error('hyperAddinventory error:', err);
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException({
        success: false,
        message: 'Something went wrong.',
        error: err.message,
      });
    }
  }

  /**
   * @description Sync inventory of consumer order whenever item sold or inactive
   */
  async syncPackagesAfterStockReduction(user: getUser, body: DTO.SyncConsumerOrderItemsDto) {
    let transaction: any;

    try {
      const { itemIds = [] } = body;

      if (!itemIds.length) {
        return {
          success: true,
          message: 'No items to sync.',
        };
      }

      transaction = await this.sequelize.transaction();

      let didSyncAnything = false;
      const summary: any[] = [];

      const ALLOWED_STATUSES = [
        PACKAGE_STATUS.DRAFT,
        PACKAGE_STATUS.CREATED,
        PACKAGE_STATUS.SUBMITTED,
        PACKAGE_STATUS.INITIATED,
        PACKAGE_STATUS.IN_REVIEW,
        PACKAGE_STATUS.CONFIRM,
        PACKAGE_STATUS.STORE_CONFIRM,
      ];

      const affectedVariants = await this.productRepo.variantModel.findAll({
        where: {
          store_id: user.storeId,
          inventoryId: { [Op.in]: itemIds },
        },
        attributes: ['id', 'productId'],
        transaction,
      });

      if (!affectedVariants.length) {
        await transaction.commit();
        return {
          success: true,
          message: 'No variants found.',
        };
      }

      const affectedProductIds = [...new Set(affectedVariants.map((v: any) => v.productId))];

      const orderItems = await this.pkgRepo.packageOrderModel.findAll({
        where: {
          store_id: user.storeId,
          status: { [Op.in]: ALLOWED_STATUSES },
        },
        attributes: ['id'],
        include: [
          {
            model: this.pkgRepo.packageBrandModel,
            as: 'brands',
            include: [
              {
                model: this.pkgRepo.packageBrandItemsModel,
                as: 'items',
                where: {
                  product_id: { [Op.in]: affectedProductIds },
                  consumerDemand: { [Op.gt]: 0 },
                },
                include: [
                  {
                    model: this.pkgRepo.packageBrandItemsCapacityModel,
                    as: 'capacities',
                    include: [
                      {
                        model: this.productRepo.variantModel,
                        as: 'variant',
                      },
                    ],
                  },
                  {
                    model: this.pkgRepo.packageBrandItemsQtyModel,
                    as: 'sizeQuantities',
                    required: false,
                  },
                ],
              },
            ],
          },
        ],
        transaction,
      });

      for (const order of orderItems) {
        for (const brand of (order as any).brands) {
          for (const item of brand.items) {
            let sizesUpdated = 0;
            let variantsRemoved = 0;

            for (const sizeQty of item.sizeQuantities) {
              const size = String(sizeQty.variant_size).trim();

              const remainingStock =
                (await this.productRepo.variantModel.sum('quantity', {
                  where: {
                    productId: item.product_id,
                    status: 1,
                    [Op.and]: Sequelize.where(
                      Sequelize.fn('TRIM', Sequelize.col('option1Value')),
                      size,
                    ),
                  },
                  transaction,
                })) || 0;

              if (affectedVariants.length) {
                await this.pkgRepo.packageBrandItemsCapacityModel.destroy({
                  where: {
                    id: {
                      [Op.in]: affectedVariants.map((c: any) => c.id),
                    },
                  },
                  transaction,
                });

                variantsRemoved += affectedVariants.length;
                didSyncAnything = true;
              }

              const newMaxCapacity = remainingStock;
              const newSelectedCapacity =
                sizeQty.selectedCapacity > remainingStock ? remainingStock : sizeQty.selectedCapacity;

              if (newMaxCapacity !== sizeQty.maxCapacity || newSelectedCapacity !== sizeQty.selectedCapacity) {
                await sizeQty.update(
                  {
                    maxCapacity: newMaxCapacity,
                    selectedCapacity: newSelectedCapacity,
                  },
                  { transaction },
                );

                sizesUpdated++;
                didSyncAnything = true;
              }
            }

            const allQtys = await this.pkgRepo.packageBrandItemsQtyModel.findAll({
              where: { item_id: item.id },
              transaction,
            });

            const newDemand = allQtys.reduce((sum: number, q: any) => sum + (q.selectedCapacity || 0), 0);

            if (newDemand !== item.consumerDemand) {
              await item.update({ consumerDemand: newDemand }, { transaction });
              didSyncAnything = true;
            }

            if (sizesUpdated || variantsRemoved) {
              summary.push({
                product_id: item.product_id,
                sizesUpdated,
                variantsRemoved,
              });
            }
          }
        }
      }

      await transaction.commit();

      return {
        success: true,
        refetch: didSyncAnything,
        summary,
        message: didSyncAnything ? 'Packages synced after stock reduction.' : 'No stock reductions detected.',
      };
    } catch (err: any) {
      if (transaction) await transaction.rollback();
      console.error('syncPackagesAfterStockReduction error:', err);
      throw new InternalServerErrorException({
        success: false,
        message: 'Something went wrong.',
        error: err.message,
      });
    }
  }

  /**
   * @description Sync web inventories for a list of product IDs (background)
   */
  async syncWebInventories(storeDomain: string, productIds: number[]) {
    try {
      if (!Array.isArray(productIds) || productIds.length === 0) {
        throw new BadRequestException({
          success: false,
          code: {
            message: 'Product ID list cannot be empty',
            code: '400',
            status: 'Fail',
          },
        });
      }

      const store = await this.storeRepo.storeModel.findOne({
        where: { store_domain: storeDomain },
      });
      if (!store) {
        throw new NotFoundException({
          success: false,
          message: 'Store not found',
        });
      }

      console.log(`🚀 Starting background sync for product IDs: ${productIds} for store: ${storeDomain}`);

      this.markSold.syncWebInventories({ productIds, store }).catch((err) => {
        console.error(`❌ Error during background sync for ${storeDomain}:`, err.message);
      });

      return {
        success: true,
        code: {
          message: 'Web inventory sync started successfully',
          code: '200',
          status: 'Success',
        },
      };
    } catch (err: any) {
      console.error('❌ syncWebInventories controller error:', err);
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException({
        success: false,
        code: {
          message: 'Error: ' + err.message,
          code: '500',
          status: 'Fail',
        },
      });
    }
  }

  /**
   * @description Sync active inventory for a specific product ID to Shopify
   */
  async syncFullInventory(user: getUser, body: DTO.SyncFullInventoryDto) {
    try {
      const { productId } = body;
      const { storeId } = user;

      if (!productId) {
        throw new BadRequestException({
          success: false,
          message: 'Product ID is required',
        });
      }

      const store = await this.storeRepo.storeModel.findByPk(storeId);
      if (!store) {
        throw new NotFoundException({ success: false, message: 'Store not found' });
      }

      if (!store.shopify_store || !store.shopify_token) {
        throw new BadRequestException({
          success: false,
          message: 'Shopify sync is disabled for this store',
        });
      }

      console.log('store_id', storeId);
      console.log('productId', productId);

      let activeInventories = await this.productRepo.inventoryModel.findAll({
        where: {
          storeId,
          productId: productId,
          soldOn: null,
          isVisible: true,
        },
        include: [
          {
            model: this.productRepo.productListModel,
            as: 'productList',
            include: [{ model: TagSource, as: 'tags', through: { attributes: [] } }],
          },
          {
            model: this.productRepo.variantModel,
            as: 'variants',
            include: [{ model: User, as: 'user' }],
          },
        ],
      });

      if (!activeInventories.length) {
        throw new NotFoundException({
          success: false,
          message: 'No active inventory found for this product',
        });
      }

      const productActiveVariants = await this.productRepo.variantModel.findAll({
        where: {
          productId: productId,
          store_id: storeId,
          status: 1,
          quantity: { [Op.gt]: 0 },
        },
        include: [{ model: User, as: 'user' }],
      });

      const { inventories: preparedInventories, toSync: itemsToSync } =
        this.uniqueProduct.prepareUniqueProductSync(activeInventories, store);
      activeInventories = preparedInventories;

      const catalogWeb = activeInventories.find((i) => i.publishedScope === 'web' && !i.linkedImage);
      const isCatalogWebSynced = !!(catalogWeb && catalogWeb.shopifyId);

      if (itemsToSync.length === 0) {
        return {
          success: true,
          message: 'Everything is already synced.',
          webSynced: isCatalogWebSynced,
        };
      }

      const shopifyService = this.shopifyFactory.createService(store, { useGraphql: true });
      const syncResults: any[] = [];

      console.log(
        `🚀 [syncFullInventory] Syncing ${itemsToSync.length} items for product ${productId} to store ${store.store_name}`,
      );

      await runStoreSync({
        store,
        productId,
        bulkSync: false,
        shopifyService,
        activeInventories,
        productActiveVariants,
        inventoryIdFilter: null,
        getVariantsForSync: (inv, s, opts) => this.uniqueProduct.getVariantsForSync(inv, s, opts),
        loadTemplate: (id) =>
          id ? this.productRepo.templateModel.findByPk(id).catch(() => null) : Promise.resolve(null),
        persistVariantIds: this.persistVariantIds,
        syncResults,
      });

      return {
        success: true,
        message: `Sync completed for product ${productId}.`,
        webSynced: isCatalogWebSynced || syncResults.some((r) => r.scope === 'web' && r.success),
        totalSynced: syncResults.filter((r) => r.success).length,
        results: syncResults,
      };
    } catch (err: any) {
      console.error('❌ [syncFullInventory] Fatal error:', err);
      if (err instanceof HttpException) throw err;
      throw new BadRequestException({
        success: false,
        message: AllMessages.SMTHG_WRNG || 'Something went wrong.',
        error: err.message,
      });
    }
  }

  private validateBulkAddBody(body: any) {
    const items = Array.isArray(body) ? body : body ? [body] : [];
    if (items.length === 0) {
      throw new BadRequestException({
        success: false,
        message: 'Empty inventory list',
        status: 0,
      });
    }
    for (let i = 0; i < items.length; i++) {
      const sku = items[i].skuNumber;
      if (!sku || typeof sku !== 'string' || sku.trim() === '') {
        throw new BadRequestException({
          success: false,
          message: `Item at index ${i} has missing or invalid skuNumber`,
          status: 0,
        });
      }
    }
    return items;
  }

  private async triggerShopifyQueueSync(storeId: number, productIds: number[]) {
    if (!productIds.length) {
      console.warn('⚠️ No valid product IDs to sync – skipping queue.');
      return { mode: 'queue', queued: 0 };
    }

    const storeForSync = await this.storeRepo.storeModel.findByPk(storeId, {
      attributes: ['shopify_store', 'shopify_token'],
    });
    if (!storeForSync?.shopify_store || !storeForSync?.shopify_token) {
      console.warn('⚠️ Shopify credentials missing — queue sync skipped.');
      return { mode: 'queue', queued: 0 };
    }

    Promise.all(
      productIds.map((productId) =>
        this.shopifySync.enqueueProductSync(productId, storeId, { bulkSync: true, useGraphql: true }),
      ),
    ).catch((err) => console.error('Queue sync error:', err));

    console.log(`📦 Queued ${productIds.length} Shopify sync jobs (GraphQL via BullMQ)`);
    return { mode: 'queue', queued: productIds.length };
  }

  private async triggerShopifyGraphqlSync(storeId: number, productIds: number[]) {
    if (!productIds.length) {
      console.warn('⚠️ No valid product IDs to sync – skipping GraphQL.');
      return { mode: 'graphql', queued: 0 };
    }

    const storeForSync = await this.storeRepo.storeModel.findByPk(storeId, {
      attributes: ['shopify_store', 'shopify_token'],
    });
    if (!storeForSync?.shopify_store || !storeForSync?.shopify_token) {
      console.warn('⚠️ Shopify credentials missing — GraphQL sync skipped.');
      return { mode: 'graphql', queued: 0 };
    }

    Promise.all(
      productIds.map((productId) =>
        this.shopifySync.shopifyInventorySync(productId, storeId, {
          bulkSync: true,
          useGraphql: true,
        }),
      ),
    ).catch((err) => console.error('GraphQL sync error:', err));

    console.log(`[shopifyInventorySync] started GraphQL sync for ${productIds.length} product(s)`);
    return { mode: 'graphql', queued: productIds.length };
  }

  /**
   * @description addInventory2 — save DB → direct GraphQL Shopify sync (Express parity)
   */
  async addInventory(user: getUser, body: any) {
    this.validateBulkAddBody(body);

    const result = await this.bulkAdd.runBulkInventoryAdd({
      user: {
        storeId: Number(user.storeId),
        roleId: Number(user.roleId),
        userId: Number(user.userId),
        email: user.email,
      },
      body,
    });

    if (!result.success) {
      throw new HttpException(result.body ?? { success: false, message: 'Failed to add inventory' }, result.status || 400);
    }

    const syncInfo = await this.triggerShopifyGraphqlSync(result.storeId!, result.productIds ?? []);

    return {
      success: true,
      message: `Inventory saved for ${result.itemCount} product(s)`,
      productsCreated: result.productsCreated,
      variantsCreated: result.variantsCreated,
      shopifySync: syncInfo.mode,
      shopifyQueued: syncInfo.queued,
    };
  }

  /**
   * @description PATCH /inventory/:itemId — single-item delta update
   */
  async updateItemById(user: getUser, itemId: number, body: Record<string, any>) {
    const ctx = {
      storeId: Number(user.storeId),
      roleId: Number(user.roleId),
      userId: Number(user.userId),
    };

    try {
      const { results, errors, failed } = await this.updateCore.runInventoryUpdates(
        [{ itemId, ...body }],
        { ...ctx, deltaMode: true },
      );

      if (failed) {
        throw new BadRequestException({ success: false, message: 'Errors occurred during update', errors });
      }

      const first = results[0];
      return {
        code: { status: 'Success', msg: 'Item Updated', code: '200' },
        meta: {
          itemId: first.itemId,
          variantId: first.variantId,
          changedFields: first.changedFields,
          shopifyAction: first.shopifyAction,
        },
        success: true,
        message: errors.length ? 'Update Completed with errors' : 'Item Updated',
        updated: results.length,
        results: results.map((r: any) => ({
          itemId: r.itemId,
          variantId: r.variantId,
          changedFields: r.changedFields,
          shopifyAction: r.shopifyAction,
        })),
        errors: errors.length ? errors : undefined,
      };
    } catch (err: any) {
      console.error('❌ [updateItemById]:', err);
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException({
        success: false,
        message: err.message || 'Something went wrong during inventory update',
      });
    }
  }

  /**
   * @description PATCH /bulkUpdate — { targets, data } bulk delta (awaits DB, Shopify in background)
   */
  async bulkUpdateInventory(user: getUser, body: DTO.BulkUpdateInventoryDto) {
    const { targets, data } = body;
    const ctx = {
      storeId: Number(user.storeId),
      roleId: Number(user.roleId),
      userId: Number(user.userId),
    };

    if (!Array.isArray(targets) || !targets.length) {
      throw new BadRequestException({
        success: false,
        message: 'Bulk update requires a non-empty targets array.',
      });
    }
    if (!data || typeof data !== 'object') {
      throw new BadRequestException({
        success: false,
        message: 'Bulk update requires a data object with changed fields.',
      });
    }

    const sharedVariant = data.variant && typeof data.variant === 'object' ? data.variant : {};
    const items: InventoryBulkUpdateItemPayload[] = targets.map(({ itemId, variantId }) => ({
      itemId,
      ...data,
      variant: { id: variantId, ...sharedVariant },
    }));

    try {
      const result = await processBulkUpdateDb(this.updateCore, {
        storeId: ctx.storeId,
        roleId: ctx.roleId,
        userId: ctx.userId,
        items,
      });

      if (result.pendingShopifyJobs.length) {
        this.updateCore
          .flushShopifyJobs(result.pendingShopifyJobs, ctx.storeId, result.storeSnapshot)
          .catch((err) =>
            console.error('❌ [bulkUpdateInventory] Shopify flush failed:', err.message),
          );
      }

      const failedCount = result.errors.length;
      const updatedCount = items.length - failedCount;
      const message =
        failedCount > 0
          ? `Bulk update completed: ${updatedCount}/${items.length} items updated`
          : 'Bulk update completed successfully';

      return {
        code: { status: 'Success', msg: 'Bulk Update Successful', code: '200' },
        success: true,
        message,
        updated: updatedCount,
        failed: failedCount,
        errors: failedCount ? result.errors : undefined,
        queued: false,
      };
    } catch (err: any) {
      console.error('❌ [bulkUpdateInventory]:', err);
      throw new InternalServerErrorException({
        success: false,
        message: err.message || 'Something went wrong during inventory update',
      });
    }
  }

  /**
   * @description Add Product, variants, inventory from consumer to store
   */
  async addInventoryCtoS(user: getUser, body: DTO.AddInventoryCtoSDto) {
    try {
      const { userId } = user;
      const { data, storeId } = body;

      this.addCtoS.addInventoryCtoS(data, storeId, Number(userId));

      return {
        success: true,
        message: 'Inventories saved successfully.',
      };
    } catch (error: any) {
      console.error('addInventoryCtoS error:', error);
      throw new InternalServerErrorException({
        success: false,
        message: AllMessages.SMTHG_WRNG || 'Something went wrong.',
        error: error.message,
      });
    }
  }
}
