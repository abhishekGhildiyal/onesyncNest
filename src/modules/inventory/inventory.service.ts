import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Inventory, InventoryRequest, ConsumerInventory, ConsumerProductList, ConsumerProductVariant, ConsumerProductsMapping } from './entities';
import { ProductList, Variant, Brand } from '../products/entities';
import { AllMessages } from '../../common/constants/messages';
import { Op, Sequelize } from 'sequelize';

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(Inventory) private inventoryModel: typeof Inventory,
    @InjectModel(InventoryRequest) private inventoryRequestModel: typeof InventoryRequest,
    @InjectModel(ConsumerInventory) private consumerInventoryModel: typeof ConsumerInventory,
    @InjectModel(ConsumerProductList) private consumerProductListModel: typeof ConsumerProductList,
    @InjectModel(ConsumerProductVariant) private consumerVariantModel: typeof ConsumerProductVariant,
    @InjectModel(ConsumerProductsMapping) private productMappingModel: typeof ConsumerProductsMapping,
    @InjectModel(ProductList) private productListModel: typeof ProductList,
    @InjectModel(Variant) private variantModel: typeof Variant,
    @InjectModel(Brand) private brandModel: typeof Brand,
  ) {}

  async getAllInventory(user: any, body: any) {
    const { userId } = user;
    const { page = 1, limit = 10, search, productType, size, sort = 'newest', brand } = body;

    try {
      const Nlimit = parseInt(limit);
      const offset = (parseInt(page) - 1) * Nlimit;

      const whereClause: any = { consumerId: userId };

      if (size) {
        whereClause.size = size;
      }

      if (productType) {
        whereClause.type = productType;
      }

      let order: any = [['createdAt', 'DESC']];
      const sortValue = sort.toLowerCase() || 'newest';

      switch (sortValue) {
        case 'newest':
          order = [['createdAt', 'DESC']];
          break;
        case 'oldest':
          order = [['createdAt', 'ASC']];
          break;
        case 'name_asc':
          order = [[{ model: ConsumerProductList, as: 'product' }, 'itemName', 'ASC']];
          break;
        case 'name_desc':
          order = [[{ model: ConsumerProductList, as: 'product' }, 'itemName', 'DESC']];
          break;
      }

      const includeClause: any[] = [
        {
          model: ConsumerProductList,
          as: 'product',
          attributes: ['skuNumber', 'itemName', 'image', 'brand_id', 'productId'],
          where: {},
        },
      ];

      if (search) {
        includeClause[0].where.itemName = { [Op.like]: `%${search}%` };
      }
      if (brand) {
        includeClause[0].where.brand_id = brand;
      }

      const { rows: variantList, count: total } = await this.consumerInventoryModel.findAndCountAll({
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
          currentPage: parseInt(page),
        },
      };
    } catch (err) {
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async consumerProducts(user: any, body: any) {
    try {
      const { userId } = user;
      const { page = 1, limit = 10 } = body;

      const consumerProductMappings = await this.productMappingModel.findAll({
        where: { consumerId: userId },
        attributes: ['productId'],
        raw: true,
      });

      const productIds = consumerProductMappings.map((m) => m.productId);

      if (productIds.length === 0) {
        return {
          success: true,
          data: [],
          pagination: {
            total: 0,
            totalPages: 0,
            currentPage: parseInt(page),
          },
        };
      }

      const Nlimit = parseInt(limit);
      const offset = (parseInt(page) - 1) * Nlimit;

      const { rows: products, count: total } = await this.consumerProductListModel.findAndCountAll({
        where: { productId: { [Op.in]: productIds } },
        limit: Nlimit,
        offset,
        order: [['updatedAt', 'DESC']],
        raw: true,
      });

      const consumerProductIds = products.map((p) => p.productId);

      const stockCounts = await this.consumerVariantModel.findAll({
        where: { productId: { [Op.in]: consumerProductIds } },
        attributes: ['productId', [Sequelize.fn('COUNT', Sequelize.col('id')), 'stockCount']],
        group: ['productId'],
        raw: true,
      });

      const stockMap = stockCounts.reduce((acc, item: any) => {
        acc[item.productId] = item.stockCount;
        return acc;
      }, {});

      const productsWithStock = products.map((p) => ({
        ...p,
        stockCount: stockMap[p.productId] || 0,
      }));

      return {
        success: true,
        data: productsWithStock,
        pagination: {
          total,
          totalPages: Math.ceil(total / Nlimit),
          currentPage: parseInt(page),
        },
      };
    } catch (err) {
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async productVariants(body: any) {
    const { productId } = body;
    try {
      const detail = await this.consumerProductListModel.findOne({
        where: { productId },
        include: [
          {
            model: ConsumerProductVariant,
            as: 'variants',
          },
        ],
      });

      return {
        success: true,
        data: detail,
      };
    } catch (err) {
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async inventoryBrands(user: any) {
    try {
      const { userId } = user;
      const productMappings = await this.productMappingModel.findAll({
        where: { consumerId: userId },
        attributes: ['productId'],
        raw: true,
      });
      const productIds = productMappings.map((m) => m.productId);

      const productBrands = await this.consumerProductListModel.findAll({
        where: { productId: { [Op.in]: productIds } },
        attributes: ['brand', 'brand_id'],
        raw: true,
      });

      const uniqueBrands = [
        ...new Map(
          productBrands.map((b: any) => [
            b.brand_id as any,
            { brand_id: b.brand_id, brand: b.brand } as any,
          ]),
        ).values(),
      ];

      return {
        success: true,
        data: uniqueBrands,
      };
    } catch (err) {
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async hyperAddinventory(body: any) {
    const sequelize = this.inventoryModel.sequelize;
    if (!sequelize) {
      throw new BadRequestException('Sequelize instance not found');
    }
    const t = await sequelize.transaction();
    try {
      const { productId, size, action, count = 1 } = body;

      const allActiveVariants = await this.variantModel.findAll({
        where: { productId, status: 1 },
        transaction: t,
      });

      const product = await this.productListModel.findByPk(productId, {
        transaction: t,
      });

      if (!allActiveVariants.length) {
        await t.rollback();
        throw new BadRequestException('No active variants found for this product.');
      }

      const originalVariant = await this.variantModel.findOne({
        where: { productId, option1Value: size, status: 1 },
        order: [['created_on', 'DESC']],
        transaction: t,
      });

      const calcAvg = (field: string) =>
        allActiveVariants.reduce((sum, v) => sum + (Number(v[field]) || 0), 0) /
        allActiveVariants.length;

      const findMostUsedLocation = () => {
        const counts: any = {};
        for (const v of allActiveVariants) {
          if (!v.location) continue;
          counts[v.location] = (counts[v.location] || 0) + 1;
        }
        return Object.entries(counts).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || null;
      };

      if (action === 'add') {
        const priceToUse = originalVariant?.price || calcAvg('price');
        const costToUse = originalVariant?.cost || calcAvg('cost');
        const locationToUse = originalVariant?.location || findMostUsedLocation();

        const newVariants: any[] = [];

        for (let i = 0; i < count; i++) {
          const inventory = await this.inventoryModel.create(
            {
              skuNumber: product?.skuNumber,
              itemName: product?.itemName,
              displayName: product?.itemName,
              category: product?.category,
              color: product?.color,
              storeId: originalVariant?.store_id,
              productId,
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

          // Get plain variant data to clone
          const variantData = originalVariant ? originalVariant.get({ plain: true }) : {};
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
            productId,
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

        await this.variantModel.bulkCreate(newVariants, { transaction: t });
        await t.commit();

        return {
          success: true,
          message: `${count} new ${size} inventory + variant(s) added.`,
        };
      }

      if (action === 'remove') {
        const variantsToRemove = await this.variantModel.findAll({
          where: { productId, option1Value: size, status: 1 },
          order: [['created_on', 'DESC']],
          limit: count,
          transaction: t,
        });

        if (!variantsToRemove.length) {
          await t.rollback();
          throw new BadRequestException(`No active ${size} variants found to remove.`);
        }

        const variantIds = variantsToRemove.map((v) => v.id);
        const inventoryIds = variantsToRemove.map((v) => v.inventoryId);

        await this.variantModel.update({ status: 0 }, { where: { id: variantIds }, transaction: t });
        await this.inventoryModel.update(
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
      throw new BadRequestException("Invalid action. Use 'add' or 'remove'.");
    } catch (err) {
      if (t) await t.rollback();
      throw err instanceof BadRequestException ? err : new BadRequestException(err.message);
    }
  }
}
