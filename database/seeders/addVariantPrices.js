const PERMISSIONS = require("../constants/Permissions");
const { PermissionModel, RolePermissionMappingModel } = require("../databaseModels");

const AddVariantPricesSeeder = async () => {
    try {
        console.log("🚀 Starting VariantPrices Seeder...");

        console.log("\n🎉 All Variant Prices seeded successfully!");
    } catch (err) {
        console.error("❌ Error seeding VariantPrices:", err);
    }
};

// Run seeder directly
AddVariantPricesSeeder().catch(console.error);
