import { BadRequestException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { Op, col, fn, where } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { getUser } from 'src/common/interfaces/common/getUser';
import { PackageRepository } from 'src/db/repository/package.repository';
import { ProductRepository } from 'src/db/repository/product.repository';
import { StoreRepository } from 'src/db/repository/store.repository';
import { UserRepository } from 'src/db/repository/user.repository';
import { BRAND_STATUS, PACKAGE_STATUS } from '../../common/constants/enum';
import { AllMessages } from '../../common/constants/messages';
import { generateAlphaNumericPassword, hashPasswordMD5 } from '../../common/helpers/hash.helper';
import { generateOrderId } from '../../common/helpers/order-generator.helper';
import { generatePackageLink } from '../../common/helpers/package-link.helper';
import { sortSizes } from '../../common/helpers/sort-sizes.helper';
import { TemplatesSlug } from '../mail/mail.constants';
import { MailService } from '../mail/mail.service';
import { SocketGateway } from '../socket/socket.gateway';
import * as DTO from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly pkgRepo: PackageRepository,
    private readonly userRepo: UserRepository,
    private readonly storeRepo: StoreRepository,
    private readonly mailService: MailService,
    private readonly socketGateway: SocketGateway,
    private sequelize: Sequelize,
  ) {}

  /**
   * @description Fetch all brands
   * @param user
   * @param query
   * @returns
   */
  async allBrands(user: getUser, query: any) {
    try {
      const { storeId } = user;
      const { search, sort = 'ASC' } = query;

      const whereCondition: any = {
        store_id: storeId,
        status: BRAND_STATUS.ACTIVE,
      };

      if (search) {
        whereCondition.brandName = { [Op.like]: `%${search}%` };
      }

      const sortOrder = sort?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      // STEP 1: Fetch active brands
      const brands = await this.productRepo.brandModel.findAll({
        where: whereCondition,
        order: [['brandName', sortOrder]],
        attributes: ['id', 'brandName', 'type'],
      });

      if (!brands.length) {
        return { success: true, message: AllMessages.FTCH_BRANDS, data: {} };
      }

      const brandIds = brands.map((b) => b.get('id'));

      // STEP 2: Fetch products under brands
      const products = await this.productRepo.productListModel.findAll({
        where: { brand_id: { [Op.in]: brandIds } },
        attributes: ['product_id', 'brand_id', 'itemName'],
      });

      if (!products.length) {
        return { success: true, message: AllMessages.FTCH_BRANDS, data: {} };
      }

      const productIds = products.map((p) => p.get('product_id'));

      // STEP 3: Fetch active variants with stock
      const variants = await this.productRepo.variantModel.findAll({
        where: {
          productId: { [Op.in]: productIds },
          status: 1,
          quantity: { [Op.gt]: 0 },
          option1Value: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] },
        },
        attributes: ['id', 'productId'],
      });

      if (!variants.length) {
        return { success: true, message: AllMessages.FTCH_BRANDS, data: {} };
      }

      const validProductIds = new Set(variants.map((v) => v.get('productId')));

      // STEP 4: Filter products having valid variants
      const filteredProducts = products.filter((p) => validProductIds.has(p.get('product_id')));

      if (!filteredProducts.length) {
        return { success: true, message: AllMessages.FTCH_BRANDS, data: {} };
      }

      // Group products by brand
      const productsByBrand = filteredProducts.reduce(
        (acc, product) => {
          const brandId = product.get('brand_id');
          if (!acc[brandId]) acc[brandId] = [];
          acc[brandId].push(product.toJSON());
          return acc;
        },
        {} as Record<number, any[]>,
      );

      // STEP 5: Group brands alphabetically
      const grouped = brands.reduce(
        (acc, brand) => {
          const brandId = brand.get('id');
          const items = productsByBrand[brandId] || [];

          if (items.length > 0) {
            const firstChar = (brand.get('brandName') || '').trim().charAt(0).toUpperCase();

            if (!acc[firstChar]) acc[firstChar] = [];
            acc[firstChar].push({
              ...brand.toJSON(),
              products: items.sort((a, b) =>
                (a.itemName || '').toLowerCase().localeCompare((b.itemName || '').toLowerCase()),
              ),
            });
          }

          return acc;
        },
        {} as Record<string, any[]>,
      );

      // STEP 6: Sort groups and brands
      const sortedKeys = Object.keys(grouped).sort((a, b) =>
        sortOrder === 'ASC' ? a.localeCompare(b) : b.localeCompare(a),
      );

      const sortedData = sortedKeys.reduce(
        (acc, key) => {
          acc[key] = grouped[key].sort((a, b) =>
            sortOrder === 'ASC'
              ? (a.brandName || '').toLowerCase().localeCompare((b.brandName || '').toLowerCase())
              : (b.brandName || '').toLowerCase().localeCompare((a.brandName || '').toLowerCase()),
          );
          return acc;
        },
        {} as Record<string, any[]>,
      );

      return {
        success: true,
        message: AllMessages.FTCH_BRANDS,
        data: sortedData,
      };
    } catch (err) {
      console.error(err);
      throw new BadRequestException({ success: false, message: AllMessages.SMTHG_WRNG });
    }
  }

  /**
   * @description Brand products for access list
   */
  async brandProductsAcessList(user: getUser, body: DTO.BrandProductsDto) {
    try {
      const { storeId } = user;
      const { brandIds } = body;

      if (!Array.isArray(brandIds) || brandIds.length === 0) {
        throw new BadRequestException({ success: false, message: 'brandIds must be a non-empty array.' });
      }

      // Step 1: Fetch products
      const products = await this.productRepo.productListModel.findAll({
        where: {
          storeId: storeId,
          brand_id: { [Op.in]: brandIds },
        },
        attributes: ['product_id', 'itemName', 'image', 'brand_id', 'type', 'skuNumber'],
        raw: true,
      });

      const productIds = products.map((p) => p.product_id);

      // Step 2: Fetch variants
      const variants = await this.productRepo.variantModel.findAll({
        where: {
          productId: { [Op.in]: productIds },
          status: 1,
          quantity: { [Op.gt]: 0 },
          option1Value: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] },
        },
        attributes: ['id', 'quantity', 'option1Value', 'productId'],
        raw: true,
      });

      // Step 3: Fetch brand names
      const brandIdList = [...new Set(products.map((p) => p.brand_id))];
      const brands = await this.productRepo.brandModel.findAll({
        where: { id: { [Op.in]: brandIdList } },
        attributes: ['id', 'brandName'],
        raw: true,
      });

      const brandMap = new Map(brands.map((b) => [b.id, b.brandName.trim()]));
      const variantGroup = new Map();

      for (const v of variants) {
        if (!variantGroup.has(v.productId)) variantGroup.set(v.productId, []);
        variantGroup.get(v.productId).push(v);
      }

      const groupedByBrand: any = {};
      const groupedByType: any = {};
      const groupedByBrandAndType: any = {};
      const brandDisplayNames: any = {};

      for (const product of products) {
        const rawBrandName = brandMap.get(product.brand_id) || 'Unknown';
        const normalizedBrandName = rawBrandName.toLowerCase();
        const type = product.type || '-';

        const productVariants = variantGroup.get(product.product_id) || [];
        if (productVariants.length === 0) continue;

        // Build variant size and quantity map
        const variantMap = new Map();
        for (const variant of productVariants) {
          const size = (variant.option1Value || 'unknown').trim();
          variantMap.set(size, (variantMap.get(size) || 0) + (variant.quantity || 0));
        }

        const sizeAndQuantity = sortSizes(
          Array.from(variantMap.entries()).map(([size, quantity]) => ({
            size,
            quantity,
          })),
        );

        const productObj = {
          name: product.itemName || 'Unnamed',
          product_id: product.product_id,
          sku: product.skuNumber,
          type: product.type,
          itemName: product.itemName,
          image: product.image,
          brand_id: product.brand_id,
          brandData: { brandName: rawBrandName },
          variants: productVariants,
          sizeAndQuantity,
        };

        // --- Group by Brand ---
        if (!groupedByBrand[normalizedBrandName]) {
          groupedByBrand[normalizedBrandName] = [];
          brandDisplayNames[normalizedBrandName] = rawBrandName;
        }
        groupedByBrand[normalizedBrandName].push(productObj);

        // --- Group by Type ---
        if (!groupedByType[type]) groupedByType[type] = [];
        groupedByType[type].push(productObj);

        // --- Group by Brand → Type ---
        if (!groupedByBrandAndType[normalizedBrandName]) {
          groupedByBrandAndType[normalizedBrandName] = {};
          brandDisplayNames[normalizedBrandName] = rawBrandName;
        }
        if (!groupedByBrandAndType[normalizedBrandName][type]) {
          groupedByBrandAndType[normalizedBrandName][type] = [];
        }
        groupedByBrandAndType[normalizedBrandName][type].push(productObj);
      }

      // --- Sort Brand Arrays ---
      for (const brand in groupedByBrand) {
        groupedByBrand[brand].sort((a: any, b: any) =>
          (a.itemName || '').toLowerCase().localeCompare((b.itemName || '').toLowerCase()),
        );
      }

      // --- Sort Brand→Type Arrays, "-" type last ---
      const sortedBrandTypeData: any = {};
      for (const brand in groupedByBrandAndType) {
        const sortedTypes = Object.keys(groupedByBrandAndType[brand]).sort((a, b) => {
          if (a === '-' || a.trim() === '') return 1; // push "-" last
          if (b === '-' || b.trim() === '') return -1;
          return a.localeCompare(b);
        });

        const sortedTypeObj: any = {};
        for (const type of sortedTypes) {
          groupedByBrandAndType[brand][type].sort((a: any, b: any) =>
            (a.itemName || '').toLowerCase().localeCompare((b.itemName || '').toLowerCase()),
          );
          sortedTypeObj[type] = groupedByBrandAndType[brand][type];
        }

        const displayName = brandDisplayNames[brand] || brand;
        sortedBrandTypeData[displayName] = sortedTypeObj;
      }

      // --- Sort brands alphabetically, push "-" last ---
      const sortedBrandData = Object.keys(groupedByBrand)
        .sort((a, b) => {
          if (a === '-' || a.trim() === '') return 1;
          if (b === '-' || b.trim() === '') return -1;
          return a.localeCompare(b);
        })
        .reduce((acc: any, normBrand) => {
          const displayName = brandDisplayNames[normBrand] || normBrand;
          acc[displayName] = groupedByBrand[normBrand];
          return acc;
        }, {});

      return {
        success: true,
        message: AllMessages.FTCH_PRODUCTS,
        data: {
          groupedByBrand: sortedBrandData,
          groupedByBrandAndType: sortedBrandTypeData,
        },
      };
    } catch (err) {
      console.error('❌ brandProducts error:', err);
      throw new BadRequestException({ success: false, message: AllMessages.SMTHG_WRNG });
    }
  }

  /**
   * @description Get access package brand products
   */
  async getAccessPackageBrandProducts(req: Request, body: DTO.BrandProductsDto) {
    try {
      const { orderId: orderIdParam } = req.params as { orderId?: string | number };
      const { brandIds = [], orderId: orderIdBody } = body;
      const orderId = orderIdBody ?? orderIdParam;

      if (!Array.isArray(brandIds) || brandIds.length === 0) {
        throw new BadRequestException({
          success: false,
          message: 'brandIds array is required.',
        });
      }

      // --- Access Models
      const OrderModel = this.pkgRepo.accessPackageOrderModel;
      const BrandItemsModel = this.pkgRepo.accessPackageBrandItemsModel;

      // --- Verify Order
      const packageOrderData = await OrderModel.findByPk(orderId, {
        attributes: ['status'],
      });

      if (!packageOrderData) {
        throw new BadRequestException({ success: false, message: AllMessages.PAKG_NF });
      }

      // --- Relations
      const includeArray = [
        {
          model: this.productRepo.productListModel,
          as: 'products',
          attributes: ['product_id', 'itemName', 'image', 'skuNumber', 'type', 'brand_id'],
          include: [
            {
              model: this.productRepo.brandModel,
              as: 'brandData',
              attributes: ['brandName'],
            },
            {
              model: this.productRepo.variantModel,
              as: 'variants',
              where: { status: 1, quantity: { [Op.gt]: 0 } },
              attributes: ['id', 'option1Value', 'quantity'],
            },
          ],
        },
      ];

      // --- Fetch All Brand Items
      const brandItems: any = await BrandItemsModel.findAll({
        where: { packageBrand_id: { [Op.in]: brandIds } },
        include: includeArray,
      });

      if (!brandItems?.length) {
        throw new BadRequestException({ success: false, message: AllMessages.PAKG_NF });
      }

      // --- Transform into grouped format
      const groupedByBrand = {};
      const groupedByBrandAndType = {};
      const brandDisplayNames = {};

      for (const item of brandItems) {
        const product = item.products;
        if (!product || !product.variants?.length) continue;

        const brandName = product.brandData?.brandName?.trim() || 'Unknown';
        const normalizedBrand = brandName.toLowerCase();
        const type = product.type || '-/-';

        // Build variant + size map
        const variantMap = new Map();
        const variants: any = [];

        for (const v of product.variants) {
          const size = (v.option1Value || 'Unknown').trim();
          const qty = v.quantity || 0;
          variantMap.set(size, (variantMap.get(size) || 0) + qty);
          variants.push({
            id: v.id,
            option1: 'Size',
            option1Value: size,
            total_quantity: qty,
            stock_quantity: qty,
          });
        }

        const sizeAndQuantity = sortSizes(
          Array.from(variantMap.entries()).map(([size, quantity]) => ({
            size,
            quantity,
            demand: 0,
            shortage: 0,
            receivedQuantity: 0,
          })),
        );

        const productObj = {
          name: product.itemName || 'Unnamed',
          productMainId: product.product_id,
          product_id: item.id,
          itemName: product.itemName,
          image: product.image,
          skuNumber: product.skuNumber,
          brand_id: product.brand_id,
          brandData: { brandName },
          variants: sortSizes(variants),
          sizeAndQuantity,
          price: item.price,
          isItemReceived: item.isItemReceived || null,
          type,
        };

        // --- Group by Brand
        if (!groupedByBrand[normalizedBrand]) {
          groupedByBrand[normalizedBrand] = [];
          brandDisplayNames[normalizedBrand] = brandName;
        }
        groupedByBrand[normalizedBrand].push(productObj);

        // --- Group by Brand → Type
        if (!groupedByBrandAndType[normalizedBrand]) {
          groupedByBrandAndType[normalizedBrand] = {};
          brandDisplayNames[normalizedBrand] = brandName;
        }
        if (!groupedByBrandAndType[normalizedBrand][type]) {
          groupedByBrandAndType[normalizedBrand][type] = [];
        }
        groupedByBrandAndType[normalizedBrand][type].push(productObj);
      }

      // --- Sort Brand Arrays
      for (const brand in groupedByBrand) {
        groupedByBrand[brand].sort((a, b) =>
          (a.itemName || '').toLowerCase().localeCompare((b.itemName || '').toLowerCase()),
        );
      }

      // --- Sort Brand → Type Arrays
      for (const brand in groupedByBrandAndType) {
        for (const type in groupedByBrandAndType[brand]) {
          groupedByBrandAndType[brand][type].sort((a, b) =>
            (a.itemName || '').toLowerCase().localeCompare((b.itemName || '').toLowerCase()),
          );
        }
      }

      // --- Rename brands to display name
      const sortedBrandData = Object.keys(groupedByBrand)
        .sort((a, b) => a.localeCompare(b))
        .reduce((acc, normBrand) => {
          const displayName = brandDisplayNames[normBrand] || normBrand;
          acc[displayName] = groupedByBrand[normBrand];
          return acc;
        }, {});

      const sortedBrandTypeData = Object.keys(groupedByBrandAndType)
        .sort((a, b) => a.localeCompare(b))
        .reduce((acc, normBrand) => {
          const displayName = brandDisplayNames[normBrand] || normBrand;
          acc[displayName] = groupedByBrandAndType[normBrand];
          return acc;
        }, {});

      // --- Final Response (same format as brandProducts)
      return {
        success: true,
        message: AllMessages.FTCH_PRODUCTS,
        data: {
          groupedByBrand: sortedBrandData,
          groupedByBrandAndType: sortedBrandTypeData,
        },
      };
    } catch (err) {
      console.error('❌ getAccessPackageBrandProducts error:', err);
      throw new BadRequestException({ success: false, message: AllMessages.SMTHG_WRNG });
    }
  }

  /**
   * @description Toggle brand type ("Public", "Private")
   */
  async toggleType(body: any) {
    try {
      const { type, brandId, brandName } = body;
      const brand = await this.productRepo.brandModel.findByPk(brandId);
      if (!brand) {
        throw new BadRequestException({ message: AllMessages.BRAND_NF });
      }

      if (brandName) {
        const existingBrand = await this.productRepo.brandModel.findOne({
          where: { brandName, id: { [Op.ne]: brandId } },
        });
        if (existingBrand) throw new BadRequestException({ success: false, message: 'Brand name already exists.' });
        brand.brandName = brandName;
      }

      if (type) brand.type = type;
      await brand.save();

      return { success: true, message: AllMessages.BRAND_UPDT };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException({ success: false, message: AllMessages.SMTHG_WRNG });
    }
  }

  /**
   * @description get all products by brandIds
   */
  async brandProducts(user: any, body: any) {
    try {
      const { storeId } = user;
      const { brandIds } = body;

      if (!Array.isArray(brandIds) || brandIds.length === 0) {
        throw new BadRequestException({
          success: false,
          message: 'brandIds must be a non-empty array.',
        });
      }

      // ================== STEP 1: PRODUCTS ==================
      const products = await this.productRepo.productListModel.findAll({
        where: {
          storeId: storeId,
          brand_id: { [Op.in]: brandIds },
        },
        attributes: ['product_id', 'itemName', 'image', 'brand_id', 'type'],
        raw: true,
      });

      if (products.length === 0) {
        return {
          success: true,
          message: AllMessages.FTCH_PRODUCTS,
          data: {},
        };
      }

      const productIds = products.map((p) => p.product_id);

      // ================== STEP 2: VARIANTS ==================
      const variants = await this.productRepo.variantModel.findAll({
        where: {
          productId: { [Op.in]: productIds },
          status: 1,
          quantity: { [Op.gt]: 0 },
          // relaxed filter (most common issue)
          option1Value: {
            [Op.ne]: null,
          },
        },
        attributes: ['id', 'quantity', 'option1Value', 'productId'],
        raw: true,
      });

      // ================== STEP 3: BRANDS ==================
      const brandIdList = [...new Set(products.map((p) => p.brand_id))];

      const brands = await this.productRepo.brandModel.findAll({
        where: { id: { [Op.in]: brandIdList } },
        attributes: ['id', 'brandName'],
        raw: true,
      });

      const brandMap = new Map(brands.map((b) => [b.id, b.brandName.trim()]));

      // ================== STEP 4: GROUP VARIANTS ==================
      const variantGroup = new Map<number, any[]>();

      for (const v of variants) {
        if (!variantGroup.has(v.productId)) {
          variantGroup.set(v.productId, []);
        }
        variantGroup.get(v.productId)!.push(v);
      }

      // ================== STEP 5: GROUP PRODUCTS ==================
      const grouped: Record<string, any[]> = {};
      const brandDisplayNames: Record<string, string> = {};

      for (const product of products) {
        const rawBrandName = brandMap.get(product.brand_id) || 'Unknown';
        const normalizedBrandName = rawBrandName.toLowerCase();

        const productVariants = variantGroup.get(product.product_id) || [];

        if (productVariants.length === 0) continue;

        if (!grouped[normalizedBrandName]) {
          grouped[normalizedBrandName] = [];
          brandDisplayNames[normalizedBrandName] = rawBrandName;
        }

        const variantMap = new Map<string, number>();
        for (const variant of productVariants) {
          const size = (variant.option1Value || 'unknown').trim();
          variantMap.set(size, (variantMap.get(size) || 0) + (variant.quantity || 0));
        }

        const sizeAndQuantity = sortSizes(
          Array.from(variantMap.entries()).map(([size, quantity]) => ({
            size,
            quantity,
          })),
        );

        grouped[normalizedBrandName].push({
          name: product.itemName || 'Unnamed',
          product_id: product.product_id,
          itemName: product.itemName,
          image: product.image,
          brand_id: product.brand_id,
          brandData: { brandName: rawBrandName },
          variants: productVariants,
          sizeAndQuantity,
        });
      }

      // ================== STEP 6: SORT ==================
      for (const brand in grouped) {
        grouped[brand].sort((a, b) => (a.itemName || '').toLowerCase().localeCompare((b.itemName || '').toLowerCase()));
      }

      const sortedData = Object.keys(grouped)
        .filter((brand) => grouped[brand]?.length > 0)
        .sort((a, b) => a.localeCompare(b))
        .reduce(
          (acc, normBrand) => {
            const displayName = brandDisplayNames[normBrand] || normBrand;
            acc[displayName] = grouped[normBrand];
            return acc;
          },
          {} as Record<string, any[]>,
        );

      return {
        success: true,
        message: AllMessages.FTCH_PRODUCTS,
        data: sortedData,
      };
    } catch (err) {
      console.error('❌ brandProducts error:', err);
      throw new BadRequestException({
        success: false,
        message: AllMessages.SMTHG_WRNG,
      });
    }
  }

  /**
   * @description Create Package
   */
  async createPackage(user: getUser, body: any) {
    const t = await this.sequelize.transaction();
    try {
      const { storeId, userId } = user;
      const { packageName, brands = [] } = body;

      const store = await this.storeRepo.storeModel.findByPk(storeId, {
        attributes: ['store_code', 'store_name', 'store_id'],
        transaction: t,
      });

      if (!store) {
        throw new BadRequestException({ success: false, message: AllMessages.SMTHG_WRNG });
      }

      const existingName = await this.pkgRepo.accessPackageOrderModel.findOne({
        where: { packageName },
        attributes: ['packageName'],
        transaction: t,
      });

      if (existingName) {
        throw new BadRequestException({
          success: false,
          message: 'Access list with same name already exists.',
        });
      }

      const accessPackageOrder = await this.pkgRepo.accessPackageOrderModel.create(
        {
          user_id: userId,
          order_id: await generateOrderId({
            storeId: store.store_id,
            prefix: store.store_code,
            model: this.pkgRepo.accessPackageOrderModel,
            draft: false,
            transaction: t,
          }),
          store_id: storeId,
          status: PACKAGE_STATUS.ACCESS,
          packageName,
        },
        { transaction: t },
      );

      const brandIds = brands.map((b: any) => b.brand_id).filter(Boolean);
      const validBrands = await this.productRepo.brandModel.findAll({
        where: { id: brandIds },
        transaction: t,
      });
      const brandIdSet = new Set(validBrands.map((b) => b.id));

      const brandPayload = brands
        .filter((b: any) => brandIdSet.has(b.brand_id) && (b.items?.length ?? 0) > 0)
        .map((b: any) => ({
          package_id: accessPackageOrder.id,
          brand_id: b.brand_id,
        }));

      const accessPackageBrands = await this.pkgRepo.accessPackageBrandModel.bulkCreate(brandPayload, {
        transaction: t,
        returning: true,
      });

      const brandIdToPkgBrandId = new Map<number, number>();
      accessPackageBrands.forEach((b) => brandIdToPkgBrandId.set(b.brand_id, b.id));

      const itemRecords: Array<{ packageBrand_id: number; product_id: number; quantity: null }> = [];

      for (const brand of brands) {
        if (!brandIdSet.has(brand.brand_id)) continue;

        const packageBrandId = brandIdToPkgBrandId.get(brand.brand_id);
        if (!packageBrandId) continue;

        for (const item of brand.items || []) {
          const { product_id } = item;
          if (!product_id) continue;

          itemRecords.push({
            packageBrand_id: packageBrandId,
            product_id,
            quantity: null,
          });
        }
      }

      if (itemRecords.length > 0) {
        await this.pkgRepo.accessPackageBrandItemsModel.bulkCreate(
          itemRecords.map((r) => ({
            packageBrand_id: r.packageBrand_id,
            product_id: r.product_id,
            quantity: r.quantity,
          })),
          { transaction: t },
        );
      }

      await t.commit();
      return {
        success: true,
        message: AllMessages.PAKG_CRTD,
        data: { package_id: accessPackageOrder.id },
      };
    } catch (err) {
      await t.rollback();
      console.error('❌ createPackage error:', err);
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException({ success: false, message: AllMessages.SMTHG_WRNG });
    }
  }

  /**
   * @description Get All Customers
   */
  async AllCustomers(user: getUser, query: DTO.AllCustomersDto) {
    try {
      const { search = '', linked = 'true' } = query;
      const trimmedSearch = (search as string).trim();
      const whereCondition: any = {};

      /**
            |--------------------------------------------------
            | CASE 1: linked = true  (DEFAULT)
            | Return ONLY linked customers
            |--------------------------------------------------
            */
      if (linked === 'true') {
        const linkedCustomers = await this.pkgRepo.packageOrderModel.findAll({
          where: { store_id: user.storeId },
          attributes: ['id'],
          include: [
            {
              model: this.pkgRepo.packageCustomerModel,
              as: 'customers',
              attributes: ['customer_id'],
            },
          ],
        });

        const accessCustomers = await this.pkgRepo.accessPackageOrderModel.findAll({
          where: { store_id: user.storeId },
          attributes: ['id'],
          include: [
            {
              model: this.pkgRepo.accessPackageCustomerModel,
              as: 'customers',
              attributes: ['customer_id'],
            },
          ],
        });

        const linkedIds = linkedCustomers.flatMap((c: any) => c.customers.map((cc) => cc.customer_id));
        const accessIds = accessCustomers.flatMap((c: any) => c.customers.map((cc) => cc.customer_id));

        // Make unique list
        const combinedIds = Array.from(new Set([...linkedIds, ...accessIds]));

        if (combinedIds.length === 0) {
          return {
            success: true,
            message: 'No linked customers found',
            data: [],
          };
        }

        // Apply condition: only fetch linked customers
        whereCondition.id = { [Op.in]: combinedIds };
      }

      /**
    |--------------------------------------------------
    | SEARCH filter (works for both linked/unlinked)
    |--------------------------------------------------
    */
      if (trimmedSearch) {
        whereCondition[Op.or] = [
          { email: { [Op.like]: `%${trimmedSearch}%` } },
          { firstName: { [Op.like]: `%${trimmedSearch}%` } },
          { lastName: { [Op.like]: `%${trimmedSearch}%` } },
        ];
      }

      /**
    |--------------------------------------------------
    | Fetch final customers
    |--------------------------------------------------
    */
      const customers = await this.userRepo.userModel.findAll({
        where: whereCondition,
        include: [
          {
            model: this.userRepo.userStoreMappingModel,
            as: 'mappings',
            required: true,
            attributes: [],
            include: [
              {
                model: this.userRepo.roleModel,
                as: 'role',
                attributes: [],
                where: { roleName: 'Consumer' },
                required: true,
              },
            ],
          },
        ],
        attributes: { exclude: ['password', 'issuePaymentTo'] },
        order: [
          ['firstName', 'ASC'],
          ['lastName', 'ASC'],
        ],
      });

      return {
        success: true,
        message: 'Customers fetched successfully',
        data: customers,
      };
    } catch (err) {
      console.error(err);
      throw new BadRequestException({ success: false, message: AllMessages.SMTHG_WRNG });
    }
  }

  /**
   * @description Link Customer to pkg
   */
  async linkCustomer(user: any, body: any) {
    const t = await this.sequelize.transaction();

    try {
      const { storeId } = user;
      const { packageOrderId, customers = [], showPrices } = body;

      const existingPackage = await this.pkgRepo.accessPackageOrderModel.findByPk(packageOrderId, {
        include: [
          {
            model: this.storeRepo.storeModel,
            as: 'store',
            attributes: ['store_code', 'store_name', 'store_id', 'store_icon'],
          },
        ],
        transaction: t,
      });

      if (!existingPackage) {
        throw new BadRequestException({ success: false, message: AllMessages.PAKG_NF });
      }

      const existingUsers = await this.userRepo.userModel.findAll({
        where: where(fn('LOWER', col('email')), {
          [Op.in]: customers.map((email: string) => email.toLowerCase()),
        }),
        transaction: t,
      });

      const emailToUserMap = new Map(existingUsers.map((u) => [u.email.toLowerCase(), u]));
      const newUserEmails = customers.filter((email: string) => !emailToUserMap.has(email.toLowerCase()));

      const generatedPassword = generateAlphaNumericPassword();
      const hashedPassword = hashPasswordMD5(generatedPassword);

      const newUsers = newUserEmails.map((email: string) => ({
        email,
        firstName: email.split('@')[0],
        password: hashedPassword,
        email_verified: '1',
        onboarding_status: true,
      }));

      if (newUsers.length > 0) {
        const createdUsers = await this.userRepo.userModel.bulkCreate(newUsers, {
          transaction: t,
          returning: true,
        });
        createdUsers.forEach((u) => emailToUserMap.set(u.email.toLowerCase(), u));
      }

      const [consumerRole] = await this.userRepo.roleModel.findOrCreate({
        where: { roleName: 'Consumer' },
        defaults: { roleName: 'Consumer', status: 1 },
        transaction: t,
      });

      const userMappings: Array<{ userId: number; roleId: number; storeId: number; status: number }> = [];
      const packageCustomerEntries: Array<{ package_id: number; customer_id: number }> = [];

      for (const email of customers) {
        const mappedUser = emailToUserMap.get(email.toLowerCase());
        if (!mappedUser) continue;

        userMappings.push({
          userId: mappedUser.id,
          roleId: consumerRole.roleId,
          storeId: existingPackage.store_id,
          status: 1,
        });

        packageCustomerEntries.push({
          package_id: packageOrderId,
          customer_id: mappedUser.id,
        });
      }

      const existingMappings = await this.userRepo.userStoreMappingModel.findAll({
        where: {
          userId: userMappings.map((m) => m.userId),
          roleId: consumerRole.roleId,
        },
        transaction: t,
      });

      const existingSet = new Set(
        existingMappings.map((m) => `${m.userId}-${m.roleId}-${m.status}-${m.storeId}`),
      );

      const newMappings = userMappings.filter(
        (m) => !existingSet.has(`${m.userId}-${m.roleId}-${m.status}-${m.storeId}`),
      );

      if (newMappings.length > 0) {
        await this.userRepo.userStoreMappingModel.bulkCreate(newMappings, { transaction: t });
      }

      const alreadyLinkedCustomers = await this.pkgRepo.accessPackageCustomerModel.findAll({
        where: {
          package_id: packageOrderId,
          customer_id: packageCustomerEntries.map((e) => e.customer_id),
        },
        transaction: t,
      });

      const existingCustomerSet = new Set(
        alreadyLinkedCustomers.map((e) => `${e.package_id}-${e.customer_id}`),
      );

      const newPackageCustomerEntries = packageCustomerEntries.filter(
        (e) => !existingCustomerSet.has(`${e.package_id}-${e.customer_id}`),
      );

      if (newPackageCustomerEntries.length > 0) {
        await this.pkgRepo.accessPackageCustomerModel.bulkCreate(newPackageCustomerEntries, {
          transaction: t,
          ignoreDuplicates: true,
        });
      }

      existingPackage.showPrices = showPrices;
      await existingPackage.save({ transaction: t });

      await t.commit();

      const store = (existingPackage as any).store;
      const mailPayloads = customers
        .map((email: string) => {
          this.socketGateway.server.emit(`fetchAccess-${email}`);

          const mappedUser = emailToUserMap.get(email.toLowerCase());
          if (!mappedUser) return null;

          return {
            to: email,
            packageLink: generatePackageLink('consumer/access-list/', packageOrderId, email),
            storeName: store?.store_name,
            userEmail: email,
            password: newUserEmails.includes(email) ? generatedPassword : 'Your existing password',
            frontendURL: process.env.FRONTEND_URL,
            supportEmail: process.env.SUPPORT_EMAIL,
            project: process.env.PROJECT_NAME,
            storeLogo: store?.store_icon,
          };
        })
        .filter(Boolean);

      setImmediate(() => {
        const emailTasks: Promise<unknown>[] = [];

        for (const data of mailPayloads) {
          if (!data) continue;

          try {
            const { html, subject } = this.mailService.getPopulatedTemplate(TemplatesSlug.NewPackage, {
              frontendURL: data.frontendURL,
              packageLink: data.packageLink,
              storeName: data.storeName,
              userEmail: data.userEmail,
              password: data.password,
              supportEmail: data.supportEmail,
              project: data.project,
              oneSyncLogo: process.env.ONE_SYNC_LOGO,
              storeLogo: data.storeLogo,
            });

            if (newUserEmails.includes(data.userEmail)) {
              const { html: credHtml, subject: credSubject } = this.mailService.getPopulatedTemplate(
                TemplatesSlug.NewPackageCredentials,
                {
                  frontendURL: data.frontendURL,
                  packageLink: data.packageLink,
                  storeName: data.storeName,
                  userEmail: data.userEmail,
                  password: data.password,
                  supportEmail: data.supportEmail,
                  project: data.project,
                  oneSyncLogo: process.env.ONE_SYNC_LOGO,
                  storeLogo: data.storeLogo,
                },
              );

              emailTasks.push(
                this.mailService.sendMail(data.to, credHtml, credSubject, storeId).catch((err) => {
                  console.error(`❌ Email send failed for ${data.to}:`, err.message);
                  return { success: false, to: data.to, error: err.message };
                }),
              );
            }

            const accessListHtml = html.replace(/<!-- CREDENTIALS_PLACEHOLDER -->/g, '');
            emailTasks.push(
              this.mailService.sendMail(data.to, accessListHtml, subject, storeId).catch((err) => {
                console.error(`❌ Email send failed for ${data.to}:`, err.message);
                return { success: false, to: data.to, error: err.message };
              }),
            );
          } catch (err: any) {
            console.error(`❌ Preparation error for ${data.to}:`, err.message);
            emailTasks.push(Promise.resolve({ success: false, to: data.to, error: err.message }));
          }
        }

        Promise.all(emailTasks)
          .then((results) => {
            const failed = results.filter((r: any) => r && r.success === false);
            if (failed.length) {
              console.warn(`❌ ${failed.length} email(s) failed:`);
              failed.forEach((f: any) => console.warn(` ↳ ${f.to}: ${f.error}`));
            }
          })
          .catch((err) => console.error('❌ Unexpected mail error:', err));
      });

      return { success: true, message: AllMessages.CSTMR_LNKD };
    } catch (err) {
      await t.rollback();
      console.error('❌ linkCustomer error:', err);
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException({ success: false, message: AllMessages.SMTHG_WRNG });
    }
  }

  async updatePackage(body: any) {
    const t = await this.sequelize.transaction();
    try {
      const { packageId, brands = [], packageName } = body;

      const existingPackage = await this.pkgRepo.accessPackageOrderModel.findByPk(packageId, {
        transaction: t,
      });

      if (!existingPackage) {
        throw new BadRequestException({ success: false, message: AllMessages.PAKG_NF });
      }

      if (packageName) {
        const nameExists = await this.pkgRepo.accessPackageOrderModel.findOne({
          where: {
            packageName,
            id: { [Op.ne]: packageId },
          },
          include: [
            {
              model: this.pkgRepo.accessPackageCustomerModel,
              as: 'customers',
              attributes: ['customer_id'],
            },
          ],
          transaction: t,
        });

        if (nameExists) {
          throw new BadRequestException({
            success: false,
            message: 'The package with this name already exists.',
          });
        }

        existingPackage.packageName = packageName;
        await existingPackage.save({ transaction: t });

        const linkedCustomers = await this.pkgRepo.accessPackageCustomerModel.findAll({
          where: { package_id: packageId },
          attributes: ['customer_id'],
          transaction: t,
        });

        for (const c of linkedCustomers) {
          this.socketGateway.server.emit(`fetchAccess-${c.customer_id}`);
        }
      }

      if (brands.length > 0) {
        const accessBrands = await this.pkgRepo.accessPackageBrandModel.findAll({
          where: { package_id: packageId },
          attributes: ['id'],
          transaction: t,
        });

        const packageBrandIds = accessBrands.map((b) => b.id);

        if (packageBrandIds.length > 0) {
          const brandItems = await this.pkgRepo.accessPackageBrandItemsModel.findAll({
            where: { packageBrand_id: packageBrandIds },
            attributes: ['id'],
            transaction: t,
          });

          const itemIds = brandItems.map((item) => item.id);

          if (itemIds.length > 0) {
            await Promise.all([
              this.pkgRepo.accessPackageBrandItemsQtyModel.destroy({
                where: { item_id: itemIds },
                transaction: t,
              }),
              this.pkgRepo.accessPackageBrandItemsCapacityModel.destroy({
                where: { item_id: itemIds },
                transaction: t,
              }),
            ]);
          }

          await Promise.all([
            this.pkgRepo.accessPackageBrandItemsModel.destroy({
              where: { packageBrand_id: packageBrandIds },
              transaction: t,
            }),
            this.pkgRepo.accessPackageBrandModel.destroy({
              where: { id: packageBrandIds },
              transaction: t,
            }),
          ]);
        }

        const itemRecords: Array<{
          tempId: string;
          packageBrand_id: number;
          product_id: number;
          quantity: number;
        }> = [];
        const variantRecords: Array<{ variant_id: number; maxCapacity: number | null; tempId: string }> = [];
        const sizeQtyArr: Array<{ variant_size: string; maxCapacity: number | null; tempId: string }> = [];

        for (const brand of brands) {
          const { brand_id, items = [] } = brand;
          if (!brand_id || items.length === 0) continue;

          const brandExists = await this.productRepo.brandModel.findByPk(brand_id, {
            transaction: t,
          });
          if (!brandExists) throw new Error(`Invalid brand_id: ${brand_id}`);

          const accessPackageBrand = await this.pkgRepo.accessPackageBrandModel.create(
            { package_id: packageId, brand_id },
            { transaction: t },
          );

          for (const item of items) {
            const { product_id, variants = [], mainVariants = [] } = item;
            if (!product_id) continue;

            const tempId = `${accessPackageBrand.id}-${product_id}-${Math.random()}`;
            const totalQuantity = variants.reduce(
              (sum: number, v: any) => sum + (Number(v.maxCapacity) || 0),
              0,
            );

            itemRecords.push({
              tempId,
              packageBrand_id: accessPackageBrand.id,
              product_id,
              quantity: totalQuantity,
            });

            for (const variant of variants) {
              const { variantId, maxCapacity } = variant;
              if (!variantId) continue;

              variantRecords.push({
                variant_id: variantId,
                maxCapacity: maxCapacity || null,
                tempId,
              });
            }

            for (const sizeQty of mainVariants) {
              const { size, quantity } = sizeQty;
              sizeQtyArr.push({
                variant_size: size,
                maxCapacity: quantity || null,
                tempId,
              });
            }
          }
        }

        const createdItems = await this.pkgRepo.accessPackageBrandItemsModel.bulkCreate(
          itemRecords.map((r) => ({
            packageBrand_id: r.packageBrand_id,
            product_id: r.product_id,
            quantity: r.quantity,
          })),
          { transaction: t, returning: true },
        );

        const tempIdToItemId = new Map<string, number>();
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

        const finalVariantInsert = variantRecords
          .map((v) => ({
            item_id: tempIdToItemId.get(v.tempId),
            variant_id: v.variant_id,
            maxCapacity: v.maxCapacity,
          }))
          .filter((x) => !!x.item_id);

        if (finalVariantInsert.length) {
          await this.pkgRepo.accessPackageBrandItemsCapacityModel.bulkCreate(finalVariantInsert, {
            transaction: t,
          });
        }

        const finalSizeInsert = sizeQtyArr
          .map((x) => ({
            item_id: tempIdToItemId.get(x.tempId),
            variant_size: x.variant_size,
            maxCapacity: x.maxCapacity,
          }))
          .filter((x) => !!x.item_id);

        if (finalSizeInsert.length) {
          await this.pkgRepo.accessPackageBrandItemsQtyModel.bulkCreate(finalSizeInsert, {
            transaction: t,
          });
        }
      }

      await t.commit();

      return { success: true, message: AllMessages.PAKG_UPDATED };
    } catch (err) {
      await t.rollback();
      console.error('❌ updatePackage error:', err);
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException({ success: false, message: AllMessages.SMTHG_WRNG });
    }
  }

  async getPackageCustomers(packageId: number) {
    try {
      const packageCustomers = await this.pkgRepo.accessPackageCustomerModel.findAll({
        where: { package_id: packageId },
        include: [
          {
            model: this.userRepo.userModel,
            as: 'customers',
            attributes: ['id', 'email', 'firstName', 'lastName'],
          },
        ],
      });
      return {
        success: true,
        data: packageCustomers.map((c: any) => c.customers).filter(Boolean),
      };
    } catch (err) {
      console.error('❌ getPackageCustomers error:', err);
      throw new BadRequestException({ success: false, message: AllMessages.SMTHG_WRNG });
    }
  }

  async revokeAccess(body: any) {
    const t = await this.sequelize.transaction();
    try {
      const { package_id, customer_id } = body;
      await this.pkgRepo.accessPackageCustomerModel.destroy({
        where: { package_id, customer_id },
        transaction: t,
      });
      await t.commit();

      this.socketGateway.server.emit(`fetchAccess-${customer_id}`);

      return { success: true, message: AllMessages.ACCESS_REVOKED };
    } catch (err) {
      await t.rollback();
      console.error('❌ revokeAccess error:', err);
      throw new BadRequestException({ success: false, message: AllMessages.SMTHG_WRNG });
    }
  }
}
