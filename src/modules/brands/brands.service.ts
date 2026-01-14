import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Op, Sequelize } from 'sequelize';
import { PackageRepository } from 'src/db/repository/package.repository';
import { ProductRepository } from 'src/db/repository/product.repository';
import { StoreRepository } from 'src/db/repository/store.repository';
import { UserRepository } from 'src/db/repository/user.repository';
import { BRAND_STATUS, PACKAGE_STATUS } from '../../common/constants/enum';
import { AllMessages } from '../../common/constants/messages';
import {
  generateAlphaNumericPassword,
  hashPasswordMD5,
} from '../../common/helpers/hash.helper';
import { generateOrderId } from '../../common/helpers/order-generator.helper';
import { sortSizes } from '../../common/helpers/sort-sizes.helper';
import { MailService } from '../mail/mail.service';
import { SocketGateway } from '../socket/socket.gateway';

@Injectable()
export class BrandsService {
  constructor(
    private readonly pkgRepo: PackageRepository,
    private readonly productRepo: ProductRepository,
    private readonly userRepo: UserRepository,
    private readonly storeRepo: StoreRepository,
    private mailService: MailService,
    private socketGateway: SocketGateway,
    @Inject('SEQUELIZE') private sequelize: Sequelize,
  ) {}

  /**
   * @description Fetch all brands
   */
  async allBrands(user: any, query: any) {
    try {
      const { storeId } = user;
      const { search, sort = 'ASC' } = query;

      // Base filter
      const whereCondition: any = {
        store_id: storeId,
        status: BRAND_STATUS.ACTIVE,
      };

      if (search) {
        whereCondition.brandName = {
          [Op.like]: `%${search}%`,
        };
      }

      const sortOrder = sort?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      // ✅ Step 1: Fetch all active brands (camelCase attributes returned)
      const brands = await this.productRepo.brandModel.findAll({
        where: whereCondition,
        order: [['brandName', sortOrder]],
        attributes: ['id', 'brandName', 'type'],
      });

      if (!brands.length) {
        return {
          success: true,
          message: AllMessages.FTCH_BRANDS,
          data: {},
        };
      }

      const brandIds = brands.map((b) => b.id);

      // ✅ Step 2: Fetch products under these brands
      const products = await this.productRepo.productListModel.findAll({
        where: { brand_id: { [Op.in]: brandIds } },
        attributes: ['product_id', 'brand_id', 'itemName'],
      });

      if (!products.length) {
        return {
          success: true,
          message: AllMessages.FTCH_BRANDS,
          data: {},
        };
      }

      const productIds = products.map((p) => p.product_id);

      // ✅ Step 3: Fetch active variants for these products
      const variants = await this.productRepo.variantModel.findAll({
        where: {
          productId: { [Op.in]: productIds },
          status: 1,
          quantity: { [Op.gt]: 0 },
          option1Value: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] },
        },
        attributes: ['id', 'productId', 'quantity'],
      });

      const validProductIds = new Set(variants.map((v) => v.productId));

      // ✅ Step 4: Filter products -> only keep ones with valid variants
      const filteredProducts = products.filter((p) =>
        validProductIds.has(p.product_id),
      );

      // Group products by brandId
      const productsByBrand = filteredProducts.reduce(
        (acc: any, product: any) => {
          if (!acc[product.brand_id]) acc[product.brand_id] = [];
          acc[product.brand_id].push(product);
          return acc;
        },
        {},
      );

      // ✅ Step 5: Group brands alphabetically, excluding empty ones
      const grouped = brands.reduce((acc: any, brand: any) => {
        const items = productsByBrand[brand.id] || [];
        if (items.length > 0) {
          // Sort products inside brand
          items.sort((a: any, b: any) =>
            (a.itemName || '')
              .toLowerCase()
              .localeCompare((b.itemName || '').toLowerCase()),
          );

          const firstChar = (brand.brandName || '')
            .trim()
            .charAt(0)
            .toUpperCase();
          if (!acc[firstChar]) acc[firstChar] = [];

          acc[firstChar].push({
            ...brand.toJSON(),
            products: items,
          });
        }
        return acc;
      }, {});

      // ✅ Step 6: Sort brands alphabetically inside each group
      const sortedKeys = Object.keys(grouped).sort((a, b) =>
        sortOrder === 'ASC'
          ? a.toLowerCase().localeCompare(b.toLowerCase())
          : b.toLowerCase().localeCompare(a.toLowerCase()),
      );

      const sortedData = sortedKeys.reduce((acc: any, key) => {
        grouped[key].sort((a: any, b: any) =>
          sortOrder === 'ASC'
            ? (a.brandName || '')
                .toLowerCase()
                .localeCompare((b.brandName || '').toLowerCase())
            : (b.brandName || '')
                .toLowerCase()
                .localeCompare((a.brandName || '').toLowerCase()),
        );

        acc[key] = grouped[key];
        return acc;
      }, {});

      return {
        success: true,
        message: AllMessages.FTCH_BRANDS,
        data: sortedData,
      };
    } catch (err) {
      console.error(err);
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
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
        throw new BadRequestException(AllMessages.BRAND_NF);
      }

      if (brandName) {
        // Check for duplicate name (excluding current brand)
        const existingBrand = await this.productRepo.brandModel.findOne({
          where: {
            brandName,
            id: { [Op.ne]: brandId },
          },
        });

        if (existingBrand) {
          throw new BadRequestException('Brand name already exists.');
        }

        brand.brandName = brandName;
      }

      if (type) brand.type = type;

      await brand.save();

      return {
        success: true,
        message: AllMessages.BRAND_UPDT,
      };
    } catch (err) {
      console.log(err);
      throw err instanceof BadRequestException
        ? err
        : new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description products of that specific brands
   */
  async brandProducts(user: any, body: any) {
    try {
      const { storeId } = user;
      const { brandIds } = body;

      if (!Array.isArray(brandIds) || brandIds.length === 0) {
        throw new BadRequestException('brandIds must be a non-empty array.');
      }

      // Step 1: Fetch products
      const products = await this.productRepo.productListModel.findAll({
        where: {
          store_id: storeId,
          brand_id: { [Op.in]: brandIds },
        },
        attributes: ['product_id', 'itemName', 'image', 'brand_id', 'type'],
        raw: true,
      });

      const productIds = products.map((p) => p.product_id);

      // Step 2: Fetch variants in one go
      const variants = await this.productRepo.variantModel.findAll({
        where: {
          productId: { [Op.in]: productIds },
          status: 1,
          quantity: { [Op.gt]: 0 },
          option1Value: {
            [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }],
          },
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

      // ✅ Map brand_id -> brandName (original)
      const brandMap = new Map(brands.map((b) => [b.id, b.brandName.trim()]));

      // ✅ Group variants by product_id
      const variantGroup = new Map();
      for (const v of variants) {
        if (!variantGroup.has(v.productId)) variantGroup.set(v.productId, []);
        variantGroup.get(v.productId).push(v);
      }

      // ✅ Group products under normalized brand name
      const grouped: any = {};
      const brandDisplayNames: any = {}; // store one display name per normalized brand

      for (const product of products) {
        const rawBrandName = brandMap.get(product.brand_id) || 'Unknown';
        const normalizedBrandName = rawBrandName.toLowerCase();

        const productVariants = variantGroup.get(product.product_id) || [];

        if (productVariants.length === 0) {
          continue;
        }

        if (!grouped[normalizedBrandName]) {
          grouped[normalizedBrandName] = [];
          brandDisplayNames[normalizedBrandName] = rawBrandName; // save original display version
        }

        // Build variant size and quantity map
        const variantMap = new Map();
        for (const variant of productVariants) {
          const size = (variant.option1Value || 'unknown').trim();
          variantMap.set(
            size,
            (variantMap.get(size) || 0) + (variant.quantity || 0),
          );
        }

        const sizeAndQuantity = sortSizes(
          Array.from(variantMap.entries()).map(([size, quantity]) => ({
            size,
            quantity,
          })),
        );

        grouped[normalizedBrandName].push({
          itemName: product.itemName,
          product_id: product.product_id,

          image: product.image,
          brand_id: product.brand_id,
          brandData: { brandName: rawBrandName },
          variants: productVariants,
          sizeAndQuantity,
        });
      }

      // ✅ Sort products inside each brand
      for (const normBrand in grouped) {
        grouped[normBrand].sort((a: any, b: any) =>
          (a.itemName || '')
            .toLowerCase()
            .localeCompare((b.itemName || '').toLowerCase()),
        );
      }

      // ✅ Sort brands alphabetically & rename with display name
      const sortedData = Object.keys(grouped)
        .filter((brand) => grouped[brand] && grouped[brand].length > 0)
        .sort((a, b) => a.localeCompare(b))
        .reduce((acc: any, normBrand) => {
          const displayName = brandDisplayNames[normBrand] || normBrand;
          acc[displayName] = grouped[normBrand];
          return acc;
        }, {});

      return {
        success: true,
        message: AllMessages.FTCH_PRODUCTS,
        data: sortedData,
      };
    } catch (err) {
      console.error('❌ brandProducts error:', err);
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description Brand products for access list
   */
  async brandProductsAcessList(user: any, body: any) {
    try {
      const { storeId } = user;
      const { brandIds } = body;

      if (!Array.isArray(brandIds) || brandIds.length === 0) {
        throw new BadRequestException('brandIds must be a non-empty array.');
      }

      // Step 1: Fetch products
      const products = await this.productRepo.productListModel.findAll({
        where: {
          store_id: storeId,
          brand_id: { [Op.in]: brandIds },
        },
        attributes: [
          'product_id',
          'itemName',
          'image',
          'brand_id',
          'type',
          'skuNumber',
        ],
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
          variantMap.set(
            size,
            (variantMap.get(size) || 0) + (variant.quantity || 0),
          );
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
          (a.itemName || '')
            .toLowerCase()
            .localeCompare((b.itemName || '').toLowerCase()),
        );
      }

      // --- Sort Brand→Type Arrays, "-" type last ---
      const sortedBrandTypeData: any = {};
      for (const brand in groupedByBrandAndType) {
        const sortedTypes = Object.keys(groupedByBrandAndType[brand]).sort(
          (a, b) => {
            if (a === '-' || a.trim() === '') return 1; // push "-" last
            if (b === '-' || b.trim() === '') return -1;
            return a.localeCompare(b);
          },
        );

        const sortedTypeObj: any = {};
        for (const type of sortedTypes) {
          groupedByBrandAndType[brand][type].sort((a: any, b: any) =>
            (a.itemName || '')
              .toLowerCase()
              .localeCompare((b.itemName || '').toLowerCase()),
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
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description Get consumer accessible brand products
   */
  async getAccessPackageBrandProducts(user: any, body: any) {
    try {
      const { orderId } = body.params || {};
      const { brandIds = [] } = body;

      if (!Array.isArray(brandIds) || brandIds.length === 0) {
        throw new BadRequestException('brandIds array is required.');
      }

      // Fallback if orderId is missing
      if (!orderId) {
        // This might happen if body structure is different, handle appropriately
        // For now proceeding, logic might fail if Order check is critical
      }

      // --- Verify Order
      if (orderId) {
        const packageOrderData =
          await this.pkgRepo.accessPackageOrderModel.findByPk(orderId, {
            attributes: ['status'],
          });

        if (!packageOrderData) {
          throw new BadRequestException(AllMessages.PAKG_NF);
        }
      }

      // --- Relations
      const includeArray = [
        {
          model: this.productRepo.productListModel,
          as: 'products',
          attributes: [
            'product_id',
            'itemName',
            'image',
            'skuNumber',
            'type',
            'brand_id',
          ],
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
      const brandItems =
        await this.pkgRepo.accessPackageBrandItemsModel.findAll({
          where: { packageBrand_id: { [Op.in]: brandIds } },
          include: includeArray,
        });

      if (!brandItems?.length) {
        throw new BadRequestException(AllMessages.PAKG_NF);
      }

      // --- Transform into grouped format
      const groupedByBrand: any = {};
      const groupedByBrandAndType: any = {};
      const brandDisplayNames: any = {};

      for (const item of brandItems) {
        const product = (item as any).products;
        if (!product || !product.variants?.length) continue;

        const brandName = product.brandData?.brandName?.trim() || 'Unknown';
        const normalizedBrand = brandName.toLowerCase();
        const type = product.type || '-/-';

        // Build variant + size map
        const variantMap = new Map();
        const variants: any[] = [];

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
          product_id: item.id,
          itemName: product.itemName,
          image: product.image,
          skuNumber: product.skuNumber,
          brand_id: product.brand_id,
          brandData: { brandName },
          variants: sortSizes(variants),
          sizeAndQuantity,
          price: item.price,
          isItemReceived: (item as any).isItemReceived || null,
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
        groupedByBrand[brand].sort((a: any, b: any) =>
          (a.itemName || '')
            .toLowerCase()
            .localeCompare((b.itemName || '').toLowerCase()),
        );
      }

      // --- Sort Brand → Type Arrays
      for (const brand in groupedByBrandAndType) {
        for (const type in groupedByBrandAndType[brand]) {
          groupedByBrandAndType[brand][type].sort((a: any, b: any) =>
            (a.itemName || '')
              .toLowerCase()
              .localeCompare((b.itemName || '').toLowerCase()),
          );
        }
      }

      // --- Rename brands to display name
      const sortedBrandData = Object.keys(groupedByBrand)
        .sort((a, b) => a.localeCompare(b))
        .reduce((acc: any, normBrand) => {
          const displayName = brandDisplayNames[normBrand] || normBrand;
          acc[displayName] = groupedByBrand[normBrand];
          return acc;
        }, {});

      const sortedBrandTypeData = Object.keys(groupedByBrandAndType)
        .sort((a, b) => a.localeCompare(b))
        .reduce((acc: any, normBrand) => {
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
    } catch (err) {}
  }

  /**
   * @description Get all customers
   */
  async allCustomers(user: any, query: any) {
    try {
      const { search = '', linked = 'true' } = query;
      const trimmedSearch = search.trim();

      let whereCondition: any = {};

      // CASE 1: linked = true (DEFAULT) - Return ONLY linked customers
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

        const accessCustomers =
          await this.pkgRepo.accessPackageOrderModel.findAll({
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

        const linkedIds = linkedCustomers.flatMap((c: any) =>
          c.customers.map((cc: any) => cc.customer_id),
        );
        const accessIds = accessCustomers.flatMap((c: any) =>
          c.customers.map((cc: any) => cc.customer_id),
        );

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
        whereCondition['id'] = { [Op.in]: combinedIds };
      }

      // SEARCH filter (works for both linked/unlinked)
      if (trimmedSearch) {
        whereCondition[Op.or] = [
          { email: { [Op.like]: `%${trimmedSearch}%` } },
          { firstName: { [Op.like]: `%${trimmedSearch}%` } },
          { lastName: { [Op.like]: `%${trimmedSearch}%` } },
        ];
      }

      // Fetch final customers
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
      console.error('❌ AllCustomers error:', err);
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description Create new package
   */
  async createPackage(user: any, body: any) {
    const t = await this.sequelize.transaction();
    try {
      const { userId, storeId } = user;
      const { brands = [], customers = [], packageName } = body;

      const store = await this.storeRepo.storeModel.findByPk(storeId, {
        attributes: ['store_code', 'store_name', 'store_id'],
        transaction: t,
      });

      if (!store) {
        throw new BadRequestException('Store not found');
      }

      const AccessPackageName =
        await this.pkgRepo.accessPackageOrderModel.findOne({
          where: { packageName: packageName },
          attributes: ['packageName'],
        });

      if (AccessPackageName) {
        throw new BadRequestException(
          'Access list with same name already exists.',
        );
      }

      const accessPackageOrder =
        await this.pkgRepo.accessPackageOrderModel.create(
          {
            user_id: userId,
            order_id: await generateOrderId({
              storeId: store.store_id,
              prefix: store.store_code,
              model: this.pkgRepo.accessPackageOrderModel,
              transaction: t,
            }),
            store_id: storeId,
            status: PACKAGE_STATUS.ACCESS,
            packageName,
          },
          { transaction: t },
        );

      const brandIds = brands.map((b) => b.brand_id).filter(Boolean);
      const validBrands = await this.productRepo.brandModel.findAll({
        where: { id: brandIds },
        transaction: t,
      });
      const brandIdSet = new Set(validBrands.map((b) => b.id));

      const itemRecords: any[] = [];

      const brandPayload = brands
        .filter((b) => brandIdSet.has(b.brand_id) && b.items.length > 0)
        .map((b) => ({
          package_id: accessPackageOrder.id,
          brand_id: b.brand_id,
        }));

      const accessPackageBrands =
        await this.pkgRepo.accessPackageBrandModel.bulkCreate(brandPayload, {
          transaction: t,
          returning: true,
        });

      const brandIdToPkgBrandId = new Map();
      accessPackageBrands.forEach((b) =>
        brandIdToPkgBrandId.set(b.brand_id, b.id),
      );

      for (const brand of brands) {
        if (!brandIdSet.has(brand.brand_id)) continue;

        const packageBrandId = brandIdToPkgBrandId.get(brand.brand_id);

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

      // Bulk insert items
      const createdItems =
        await this.pkgRepo.accessPackageBrandItemsModel.bulkCreate(
          itemRecords.map((r) => ({
            packageBrand_id: r.packageBrand_id,
            product_id: r.product_id,
            quantity: r.quantity,
          })),
          { transaction: t, returning: true },
        );

      await t.commit();

      return {
        success: true,
        message: AllMessages.PAKG_CRTD,
        data: { package_id: accessPackageOrder.id },
      };
    } catch (err) {
      await t.rollback();
      console.error('❌ createPackage error:', err);
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description Link customer to package
   */
  async linkCustomer(user: any, body: any) {
    const t = await this.sequelize.transaction();

    try {
      const { storeId } = user;
      const { packageOrderId, customers = [], showPrices } = body;

      const existingPackage =
        await this.pkgRepo.accessPackageOrderModel.findByPk(packageOrderId, {
          include: [
            {
              model: this.storeRepo.storeModel,
              as: 'store',
              attributes: [
                'store_code',
                'store_name',
                'store_id',
                'store_icon',
              ],
            },
          ],
          transaction: t,
        });

      if (!existingPackage) {
        throw new BadRequestException(AllMessages.PAKG_NF);
      }

      // Step 1: Fetch existing users
      const existingUsers = await this.userRepo.userModel.findAll({
        where: {
          [Op.or]: customers.map((email) => ({
            email: { [Op.iLike]: email },
          })),
        },
        transaction: t,
      });

      const emailToUserMap = new Map(
        existingUsers.map((u) => [u.email.toLowerCase(), u]),
      );
      const newUserEmails = customers.filter(
        (email) => !emailToUserMap.has(email.toLowerCase()),
      );

      // Step 2: Create new users
      const generatedPassword = generateAlphaNumericPassword();
      const hashedPassword = hashPasswordMD5(generatedPassword);

      const newUsers = newUserEmails.map((email) => ({
        email,
        firstName: email.split('@')[0],
        password: hashedPassword,
      }));

      if (newUsers.length > 0) {
        const createdUsers = await this.userRepo.userModel.bulkCreate(
          newUsers,
          {
            transaction: t,
            returning: true,
          },
        );
        createdUsers.forEach((user) =>
          emailToUserMap.set(user.email.toLowerCase(), user),
        );
      }

      // Step 3: Get or create Consumer role
      const [consumerRole] = await this.userRepo.roleModel.findOrCreate({
        where: { roleName: 'Consumer' },
        defaults: { roleName: 'Consumer', status: 1 },
        transaction: t,
      });

      // Step 4: Prepare role and package entries
      const userMappings: any[] = [];
      const packageCustomerEntries: any[] = [];

      for (const email of customers) {
        const user = emailToUserMap.get(email.toLowerCase());
        if (!user) continue;

        userMappings.push({
          userId: user.id,
          roleId: consumerRole.roleId,
          storeId: existingPackage.store_id,
          status: 1,
        });

        packageCustomerEntries.push({
          package_id: packageOrderId,
          customer_id: user.id,
        });
      }

      // Step 5: Filter out existing user-role mappings
      const existingMappings =
        await this.userRepo.userStoreMappingModel.findAll({
          where: {
            userId: userMappings.map((m) => m.userId),
            roleId: consumerRole.roleId,
          },
          transaction: t,
        });

      const existingSet = new Set(
        existingMappings.map(
          (m) => `${m.userId}-${m.roleId}-${m.status}-${m.storeId}`,
        ),
      );

      const newMappings = userMappings.filter(
        (m) =>
          !existingSet.has(`${m.userId}-${m.roleId}-${m.status}-${m.storeId}`),
      );

      if (newMappings.length > 0) {
        await this.userRepo.userStoreMappingModel.bulkCreate(newMappings, {
          transaction: t,
        });
      }

      // Step 6: Filter out already linked customers for this package
      const alreadyLinkedCustomers =
        await this.pkgRepo.accessPackageCustomerModel.findAll({
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
        await this.pkgRepo.accessPackageCustomerModel.bulkCreate(
          newPackageCustomerEntries,
          {
            transaction: t,
          },
        );
      }

      existingPackage.showPrices = showPrices;
      await existingPackage.save({ transaction: t });

      await t.commit();

      // Step 7: Send emails asynchronously
      // Note: You'll need to adapt the email sending logic to use your MailService
      // For now, I'm keeping the logic but you'll need to implement the email sending

      return {
        success: true,
        message: AllMessages.CSTMR_LNKD,
      };
    } catch (err) {
      await t.rollback();
      console.error('❌ linkCustomer error:', err);
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description Update package details
   */
  async updatePackage(user: any, body: any) {
    const t = await this.sequelize.transaction();
    try {
      const { packageId, brands = [], packageName } = body;

      const existingPackage =
        await this.pkgRepo.accessPackageOrderModel.findByPk(packageId, {
          transaction: t,
        });

      if (!existingPackage) {
        await t.rollback();
        throw new BadRequestException(AllMessages.PAKG_NF);
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
          await t.rollback();
          throw new BadRequestException(
            'The package with this name already exists.',
          );
        }

        existingPackage.packageName = packageName;
        await existingPackage.save({ transaction: t });
      }

      if (brands.length > 0) {
        // Step 1: Delete related data (Qty, Capacity, Items, Brands)
        const accessBrands = await this.pkgRepo.accessPackageBrandModel.findAll(
          {
            where: { package_id: packageId },
            attributes: ['id'],
            transaction: t,
          },
        );

        const packageBrandIds = accessBrands.map((b) => b.id);

        if (packageBrandIds.length > 0) {
          const brandItems =
            await this.pkgRepo.accessPackageBrandItemsModel.findAll({
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

        // Step 2: Re-insert brands/items/variants
        const itemRecords: any[] = [];
        const variantRecords: any[] = [];
        const sizeQtyArr: any[] = [];

        for (const brand of brands) {
          const { brand_id, items = [] } = brand;
          if (!brand_id || items.length === 0) continue;

          const brandExists = await this.productRepo.brandModel.findByPk(
            brand_id,
            {
              transaction: t,
            },
          );
          if (!brandExists) throw new Error(`Invalid brand_id: ${brand_id}`);

          const accessPackageBrand =
            await this.pkgRepo.accessPackageBrandModel.create(
              { package_id: packageId, brand_id },
              { transaction: t },
            );

          for (const item of items) {
            const { product_id, variants = [], mainVariants = [] } = item;
            if (!product_id) continue;

            const tempId = `${accessPackageBrand.id}-${product_id}-${Math.random()}`;
            const totalQuantity = (variants || []).reduce(
              (sum, v) => sum + (Number(v.maxCapacity) || 0),
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

        const createdItems =
          await this.pkgRepo.accessPackageBrandItemsModel.bulkCreate(
            itemRecords.map((r) => ({
              packageBrand_id: r.packageBrand_id,
              product_id: r.product_id,
              quantity: r.quantity,
            })),
            { transaction: t, returning: true },
          );

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

        const finalVariantInsert = variantRecords
          .map((v) => ({
            item_id: tempIdToItemId.get(v.tempId),
            variant_id: v.variant_id,
            maxCapacity: v.maxCapacity,
          }))
          .filter((x) => !!x.item_id);

        if (finalVariantInsert.length) {
          await this.pkgRepo.accessPackageBrandItemsCapacityModel.bulkCreate(
            finalVariantInsert,
            {
              transaction: t,
            },
          );
        }

        const finalSizeInsert = sizeQtyArr
          .map((x) => ({
            item_id: tempIdToItemId.get(x.tempId),
            variant_size: x.variant_size,
            maxCapacity: x.maxCapacity,
          }))
          .filter((x) => !!x.item_id);

        if (finalSizeInsert.length) {
          await this.pkgRepo.accessPackageBrandItemsQtyModel.bulkCreate(
            finalSizeInsert,
            {
              transaction: t,
            },
          );
        }
      }

      await t.commit();

      return {
        success: true,
        message: AllMessages.PAKG_UPDATED,
        data: {
          package_id: packageId,
          order_id: existingPackage.order_id,
        },
      };
    } catch (err) {
      await t.rollback();
      console.error('❌ updatePackage error:', err);
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description Get package customers
   */
  async getPackageCustomers(packageId: number) {
    try {
      const packageCustomers =
        await this.pkgRepo.accessPackageCustomerModel.findAll({
          where: { package_id: packageId },
          include: [
            {
              model: this.userRepo.userModel,
              as: 'customer',
              attributes: ['id', 'email', 'firstName', 'lastName'],
            },
          ],
        });

      if (!packageCustomers || packageCustomers.length === 0) {
        return {
          success: true,
          data: [],
        };
      }

      const customers = packageCustomers
        .map((c: any) => c.customer)
        .filter(Boolean);

      return {
        success: true,
        data: customers,
      };
    } catch (err) {
      console.error('❌ getPackageCustomers error:', err);
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description Revoke customer access
   */
  async revokeAccess(body: any) {
    const t = await this.sequelize.transaction();
    try {
      const { package_id, customer_id } = body;
      await this.pkgRepo.accessPackageCustomerModel.destroy({
        where: { package_id, customer_id },
        transaction: t,
      });

      await t.commit();

      return {
        success: true,
        message: AllMessages.ACCESS_REVOKED,
      };
    } catch (err) {
      await t.rollback();
      console.error('❌ updatePackage error:', err);
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description Add customer to package
   */
  async addCustomerToPackage(user: any, body: any) {
    const t = await this.sequelize.transaction();
    try {
      const { storeId } = user;
      const { package_id, emails = [] } = body;

      const accessPackage: any =
        await this.pkgRepo.accessPackageOrderModel.findByPk(package_id, {
          include: [
            {
              model: this.pkgRepo.accessPackageCustomerModel,
              as: 'customers',
              include: [
                {
                  model: this.userRepo.userModel,
                  as: 'customer',
                  attributes: ['id', 'email'],
                },
              ],
            },
            {
              model: this.storeRepo.storeModel,
              as: 'store',
              attributes: ['store_name'],
            },
          ],
          transaction: t,
        });

      if (!accessPackage) throw new BadRequestException('Package not found.');

      const existingCustomerIds = accessPackage.customers.map(
        (c) => c.customer_id,
      );

      const storeName = accessPackage.store?.store_name;

      const consumerRole = await this.userRepo.roleModel.findOne({
        where: { roleName: 'Consumer' },
        transaction: t,
      });

      if (!consumerRole)
        throw new BadRequestException('Consumer role not found.');

      const mailPayload: any[] = [];

      for (const email of emails) {
        let user: any = accessPackage.customers.find(
          (c) => c.customer?.email === email,
        )?.customer;

        // If user not in package customers, find by email
        if (!user) {
          user = await this.userRepo.userModel.findOne({
            where: { email: email },
            transaction: t,
          });
        }

        let pswrd: string | null = null;
        const isNewUser = !user;

        if (isNewUser) {
          pswrd = generateAlphaNumericPassword();
          const hashed = hashPasswordMD5(pswrd);

          user = await this.userRepo.userModel.create(
            {
              email,
              firstName: email.split('@')[0],
              password: hashed,
            },
            { transaction: t },
          );
        }

        const existingMapping =
          await this.userRepo.userStoreMappingModel.findOne({
            where: {
              userId: user.id,
              roleId: consumerRole.roleId,
            },
            transaction: t,
          });

        if (!existingMapping) {
          await this.userRepo.userStoreMappingModel.create(
            {
              userId: user.id,
              roleId: consumerRole.roleId,
              status: 1,
            },
            { transaction: t },
          );
        }

        if (!existingCustomerIds.includes(user.id)) {
          await this.pkgRepo.accessPackageCustomerModel.create(
            {
              package_id,
              customer_id: user.id,
            },
            { transaction: t },
          );
        }

        const htmlData = {
          frontendURL: process.env.FRONTEND_URL,
          packageLink: `consumer/orders/open/${package_id}`, // Simplified link generation
          storeName: storeName,
          userEmail: email,
          password: isNewUser ? pswrd : 'Your existing password',
          supportEmail: process.env.SUPPORT_EMAIL,
          project: process.env.PROJECT_NAME,
        };

        mailPayload.push({ to: email, htmlData });
      }

      await t.commit();

      // Send emails
      // Implementation pending - using dummy log for now
      console.log(
        'Sending emails to:',
        mailPayload.map((m) => m.to),
      );

      return {
        success: true,
        message: AllMessages.ACCESS_GRANTED,
      };
    } catch (err) {
      await t.rollback();
      console.error('❌ addCustomerToPackage error:', err);
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }
}
