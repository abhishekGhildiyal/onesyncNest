const PERMISSIONS = require("../constants/Permissions");
const { PermissionModel, RolePermissionMappingModel } = require("../databaseModels");

const AddPermissionSeeder = async () => {
    try {
        console.log("🚀 Starting Permission Seeder...");

        const entries = Object.values(PERMISSIONS);

        for (const entry of entries) {
            console.log(`\n🔍 Processing permission: "${entry.name}"`);

            // Create or fetch permission
            const [permission, created] = await PermissionModel.findOrCreate({
                where: { name: entry.name },
                defaults: {
                    name: entry.name,
                    isSuperAdminPermission: entry.isSuperAdminPermission,
                    isConsumerPermission: entry.is_consumer_permission,
                },
            });

            if (created) {
                console.log(`✅ Permission created: [id=${permission.id}] "${permission.name}"`);
            } else {
                console.log(`ℹ️ Permission already exists: [id=${permission.id}] "${permission.name}"`);
            }

            // Map each permission to roleId = 1
            const [mapping, mapCreated] = await RolePermissionMappingModel.findOrCreate({
                where: {
                    roleId: 1,
                    permissionId: permission.id,
                },
                defaults: {
                    roleId: 1,
                    permissionId: permission.id,
                },
            });

            if (mapCreated) {
                console.log(`🔗 Mapping created: roleId=1 -> permissionId=${permission.id}`);
            } else {
                console.log(`🔗 Mapping already exists: roleId=1 -> permissionId=${permission.id}`);
            }
        }

        console.log("\n🎉 All permissions seeded successfully!");
    } catch (err) {
        console.error("❌ Error seeding permissions:", err);
    }
};

// Run seeder directly
AddPermissionSeeder().catch(console.error);
