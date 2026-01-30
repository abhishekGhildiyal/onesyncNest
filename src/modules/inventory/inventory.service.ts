import { BadRequestException, Injectable } from '@nestjs/common';
import { Op, Sequelize } from 'sequelize';
import type { getUser } from 'src/common/interfaces/common/getUser';
import { PackageRepository } from 'src/db/repository/package.repository';
import { ProductRepository } from 'src/db/repository/product.repository';
import { AllMessages } from '../../common/constants/messages';
import * as DTO from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly pkgRepo: PackageRepository,
    private readonly productRepo: ProductRepository,
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

      // 🔹 Build dynamic where conditions
      const whereClause: any = { consumerId: userId };

      if (size) {
        whereClause.size = size;
      }

      if (productType) {
        whereClause.type = productType;
      }

      // Sorting
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

      // 🔹 Include clause only for product details + search
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

      // 🔹 Final query
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

      // Step 1: Get all product IDs mapped to this consumer
      const consumerProductMappings = await this.pkgRepo.consumerProductsMappingModel.findAll({
        where: { consumerId: userId },
        attributes: ['product_id'],
        raw: true,
      });

      const productIds = consumerProductMappings.map((m: any) => m.product_id);

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

      // Step 2: Apply pagination
      const Nlimit = parseInt(String(limit), 10);
      const offset = (parseInt(String(page), 10) - 1) * Nlimit;

      // Step 3: Fetch products with pagination
      const { rows: products, count: total } = await this.pkgRepo.consumerProductModel.findAndCountAll({
        where: { product_id: { [Op.in]: productIds } },
        limit: Nlimit,
        offset,
        order: [['updatedAt', 'DESC']],
        raw: true,
      });

      const consumerProductIds = products.map((p: any) => p.product_id);

      // Step 4: Get stock count grouped by productId
      const stockCounts = await this.pkgRepo.consumerProductVariantModel.findAll({
        where: { product_id: { [Op.in]: consumerProductIds } },
        attributes: ['product_id', [Sequelize.fn('COUNT', Sequelize.col('id')), 'stockCount']],
        group: ['product_id'],
        raw: true,
      });

      // Convert stock counts into a lookup map
      const stockMap = stockCounts.reduce((acc: any, item: any) => {
        acc[item.product_id] = item.stockCount;
        return acc;
      }, {});

      // Step 5: Attach stock count to each product
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
        attributes: ['product_id'],
        raw: true,
      });
      const productIds = productMappings.map((m: any) => m.product_id);

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
    // basic validation
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

    const sequelize = this.productRepo.inventoryModel.sequelize;
    if (!sequelize) {
      throw new BadRequestException({
        success: false,
        message: 'Sequelize instance not found',
      });
    }

    const t = await sequelize.transaction();
    try {
      const { productId, size, action, count = 1 } = body;

      // 🧩 Step 1: Get all active variants
      const allActiveVariants = await this.productRepo.variantModel.findAll({
        where: { product_id: productId, status: 1 },
        transaction: t,
      });

      const product = await this.productRepo.productListModel.findByPk(productId, {
        transaction: t,
      });

      if (!allActiveVariants.length) {
        await t.rollback();
        throw new BadRequestException({
          success: false,
          message: 'No active variants found for this product.',
        });
      }

      // 🧩 Step 2: Get the latest variant for selected size
      const originalVariant = await this.productRepo.variantModel.findOne({
        where: { product_id: productId, option1Value: size, status: 1 },
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

      // 🟩 ADD FLOW
      if (action === 'add') {
        const priceToUse = originalVariant?.price || calcAvg('price');
        const costToUse = originalVariant?.cost || calcAvg('cost');
        const locationToUse = originalVariant?.location || findMostUsedLocation();

        const newVariants: any[] = [];

        for (let i = 0; i < count; i++) {
          // 🧱 Step 3: Create inventory
          const inventory = await this.productRepo.inventoryModel.create(
            {
              skuNumber: product?.skuNumber,
              itemName: product?.itemName,
              displayName: product?.itemName,
              category: product?.category,
              color: product?.color,
              storeId: originalVariant?.store_id,
              product_id: productId,
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

          // 🧬 Step 4: Create variant linked to this inventory
          const variantData: any = originalVariant ? originalVariant.get({ plain: true }) : {};
          const {
            id,
            created_on,
            updated_on,
            barcode,
            custom_variant_id,
            barcode_numeric,
            web_barcode,
            ...cleanVariant
          } = variantData;

          newVariants.push({
            ...cleanVariant,
            option1: originalVariant?.option1 || 'Size',
            option1Value: size,
            product_id: productId,
            store_id: originalVariant?.store_id,
            price: priceToUse,
            cost: costToUse,
            location: locationToUse,
            quantity: 1,
            status: 1,
            inventoryId: inventory.id,
            user_id: originalVariant?.user_id,
            weight: originalVariant?.weight,
            item_id: inventory.id,
          });
        }

        await this.productRepo.variantModel.bulkCreate(newVariants, {
          transaction: t,
        });
        await t.commit();

        return {
          success: true,
          message: `${count} new ${size} inventory + variant(s) added.`,
        };
      }

      // 🟥 REMOVE FLOW
      if (action === 'remove') {
        const variantsToRemove = await this.productRepo.variantModel.findAll({
          where: { product_id: productId, option1Value: size, status: 1 },
          order: [['created_on', 'DESC']],
          limit: count,
          transaction: t,
        });

        if (!variantsToRemove.length) {
          await t.rollback();
          throw new BadRequestException({
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
      console.error('`hyperAddinventory` err:', err);
      throw new BadRequestException({
        success: false,
        message: err.message || AllMessages.SMTHG_WRNG,
      });
    }
  }
}
