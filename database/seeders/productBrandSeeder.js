// const { Op } = require("sequelize");
// const { sequelize } = require("../connection");
// const { BRAND_TYPE, BRAND_STATUS } = require("../constants/enum");
// const { BrandModel, ProductListModel } = require("../databaseModels");

// const syncProductsWithBrand = async () => {
//     try {
//         await sequelize.authenticate();
//         // await sequelize.sync({ alter: true });

//         const products = await ProductListModel.findAll({
//             where: { brand: { [Op.ne]: null } },
//             attributes: ["product_id", "brand", "brand_id", "store_id"],
//             raw: true,
//         });

//         const tasks = products
//             .filter((p) => !p.brand_id && p.brand?.trim())
//             .map((product) => {
//                 const brandName = product.brand.trim();

//                 return BrandModel.findOne({ where: { brandName } })
//                     .then((brand) => {
//                         if (brand) return brand;

//                         return BrandModel.create({
//                             brandName,
//                             type: BRAND_TYPE.PUBLIC,
//                             status: BRAND_STATUS.ACTIVE,
//                             store_id: product.store_id,
//                         });
//                     })
//                     .then((brand) => {
//                         return ProductListModel.update(
//                             { brand_id: brand.id },
//                             { where: { product_id: product.product_id } }
//                         ).then(([count]) => {
//                             console.log(
//                                 `✅ Updated ${count} row(s) for product ${product.product_id}`
//                             );
//                         });
//                     })
//                     .catch((err) => {
//                         console.error(
//                             `❌ Error processing product ${product.product_id}:`,
//                             err.message
//                         );
//                     });
//             });

//         await Promise.all(tasks);
//         console.log("🎉 All products synced with brands.");
//     } catch (err) {
//         console.error("❌ Error syncing brands:", err.message);
//     } finally {
//         await sequelize.close();
//     }
// };

// syncProductsWithBrand().catch(console.error);

const { Op } = require("sequelize");
const { sequelize } = require("../connection");
const { BRAND_TYPE, BRAND_STATUS } = require("../constants/enum");
const { BrandModel, ProductListModel } = require("../databaseModels");

const syncProductsWithBrand = async () => {
    let transaction;
    try {
        await sequelize.authenticate();
        transaction = await sequelize.transaction();

        // Step 1: Get products that have a brand string but no brand_id yet
        const products = await ProductListModel.findAll({
            where: {
                brand: { [Op.ne]: null },
                brand_id: null,
            },
            attributes: ["product_id", "brand", "storeId"], // use storeId as per your model
            raw: true,
            transaction,
        });

        console.log(`Found ${products.length} products needing brand sync`);

        // Step 2: Normalize and group by (storeId + brand lowercase)
        const brandMap = new Map();
        for (const product of products) {
            if (product.brand?.trim()) {
                const normalizedBrand = product.brand.trim().toLowerCase();
                const key = `${product.storeId}::${normalizedBrand}`;

                if (!brandMap.has(key)) {
                    brandMap.set(key, {
                        normalizedName: normalizedBrand,
                        originalName: product.brand.trim(), // preserve casing for insert
                        storeId: product.storeId,
                        productIds: [],
                    });
                }
                brandMap.get(key).productIds.push(product.product_id);
            }
        }

        console.log(`Found ${brandMap.size} unique brand-store pairs to process`);

        // Step 3: Find or create brands (case-insensitive)
        const brandResults = [];
        for (const data of brandMap.values()) {
            const [brand] = await BrandModel.findOrCreate({
                where: {
                    [Op.and]: [
                        sequelize.where(sequelize.fn("LOWER", sequelize.col("brand_name")), data.normalizedName),
                        { store_id: data.storeId },
                    ],
                },
                defaults: {
                    brandName: data.originalName,
                    type: BRAND_TYPE.PUBLIC,
                    status: BRAND_STATUS.ACTIVE,
                    store_id: data.storeId,
                },
                transaction,
            });

            brandResults.push({ brand, productIds: data.productIds });
        }

        // Step 4: Update products with their brand_id
        for (const { brand, productIds } of brandResults) {
            const [count] = await ProductListModel.update(
                { brand_id: brand.id },
                {
                    where: { product_id: { [Op.in]: productIds } },
                    transaction,
                }
            );
            console.log(`✅ Updated ${count} products with brand "${brand.brandName}" (ID: ${brand.id}) in store ${brand.store_id}`);
        }

        await transaction.commit();
        console.log("🎉 All products synced with brands successfully.");
    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error("❌ Error syncing brands:", err.message);
        throw err;
    } finally {
        await sequelize.close();
    }
};

syncProductsWithBrand().catch(console.error);
