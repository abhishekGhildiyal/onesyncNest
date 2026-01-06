const { Op } = require("sequelize");
const {
    PackageOrderModel,
    PackageBrandModel,
    PackageBrandItemsModel,
    PackageBrandItemsQtyModel,
    PackageBrandItemsCapacityModel,
    VariantModel,
    StoreModel,
} = require("../databaseModels");
const { PACKAGE_STATUS } = require("../constants/enum");

const AddVariantPriceSeeder = async () => {
    console.log("🚀 Starting AddVariantPriceSeeder (strict match by item + size + capacity count + status=2)");

    try {
        const orders = await PackageOrderModel.findAll({
            where: { status: PACKAGE_STATUS.COMPLETED },
            include: [
                {
                    model: PackageBrandModel,
                    where: { selected: true },
                    as: "brands",
                    attributes: ["id"],
                    include: [
                        {
                            model: PackageBrandItemsModel,
                            as: "items",
                            where: { isItemReceived: "Item Received" },
                            attributes: ["id", "price"],
                            include: [
                                {
                                    model: PackageBrandItemsQtyModel,
                                    as: "sizeQuantities",
                                    where: { receivedQuantity: { [Op.gt]: 0 } },
                                    attributes: ["id", "item_id", "variant_size", "selectedCapacity"],
                                },
                                {
                                    model: PackageBrandItemsCapacityModel,
                                    as: "capacities",
                                    attributes: ["id", "item_id", "variant_id"],
                                },
                            ],
                        },
                    ],
                },
            ],
        });

        let totalUpdated = 0;

        for (const order of orders) {
            // 🏪 Fetch store info
            const store = await StoreModel.findOne({
                where: { store_id: order.store_id },
                attributes: ["store_name", "store_id", "is_discount"],
            });

            if (!store) {
                console.warn(`⚠️ Store not found for order ${order.id}`);
                continue;
            }

            console.log(`🏪 Processing Store: ${store.store_name} | is_discount=${store.is_discount}`);

            for (const brand of order.brands) {
                for (const item of brand.items) {
                    const { price, sizeQuantities, capacities } = item;

                    for (const size of sizeQuantities) {
                        const { item_id, variant_size, selectedCapacity } = size;

                        // Find all variant IDs linked to this item
                        const matchedVariants = capacities
                            .filter((cap) => cap.item_id === item_id)
                            .map((cap) => cap.variant_id)
                            .filter(Boolean);

                        if (!matchedVariants.length) continue;

                        // Fetch variants with same size (option1Value) and status = 2
                        const variantsToUpdate = await VariantModel.findAll({
                            where: {
                                id: { [Op.in]: matchedVariants },
                                option1Value: variant_size,
                                status: 2,
                            },
                            order: [["id", "ASC"]],
                            limit: selectedCapacity || 1,
                        });

                        if (!variantsToUpdate.length) continue;

                        for (const variant of variantsToUpdate) {
                            const variantFee = variant.fee || 0;
                            const oldPrice = variant.price;
                            const oldPayout = variant.payout;

                            const payoutValue = store.is_discount ? price : price - (price * variantFee) / 100;

                            // Update accountType=1
                            await VariantModel.update(
                                {
                                    quantity: 0,
                                    is_consumer_order: true,
                                    order_id: order.id,
                                    price,
                                    payout: price,
                                },
                                {
                                    where: { id: variant.id, status: 2, accountType: 1 },
                                }
                            );

                            // Update accountType=0
                            await VariantModel.update(
                                {
                                    quantity: 0,
                                    is_consumer_order: true,
                                    order_id: order.id,
                                    price,
                                    ...(store.is_discount ? {} : { payout: payoutValue }),
                                },
                                {
                                    where: { id: variant.id, status: 2, accountType: 0 },
                                }
                            );

                            totalUpdated++;
                            console.log(
                                `🧩 Variant ${variant.id} | Size: ${variant_size} | Fee: ${variantFee}%\n` +
                                    `   ├─ Old Price: ${oldPrice} | Old Payout: ${oldPayout}\n` +
                                    `   ├─ New Price: ${price} | New Payout: ${payoutValue}\n` +
                                    `   └─ Store Discount Applied: ${store.is_discount ? "Yes" : "No"}`
                            );
                        }
                    }
                }
            }
        }

        console.log(`🎯 Total variants updated: ${totalUpdated}`);
    } catch (error) {
        console.error("❌ Error in AddVariantPriceSeeder:", error);
    }
};

AddVariantPriceSeeder().catch(console.error);
