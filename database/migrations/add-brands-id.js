"use strict";

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // 1. Create 'brands' table
        await queryInterface.createTable("brands", {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            brand_name: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            status: {
                type: Sequelize.ENUM("Active", "InActive"),
                allowNull: false,
            },
            type: {
                type: Sequelize.ENUM("Public", "Private"),
                allowNull: false,
            },
            store_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: "stores",
                    key: "store_id",
                },
                onUpdate: "CASCADE",
                onDelete: "SET NULL",
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
            },
        });

        // 2. Add 'brand_id' column to 'porduct_list' table
        await queryInterface.addColumn("porduct_list", "brand_id", {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                model: "brands",
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
        });
    },

    down: async (queryInterface, Sequelize) => {
        // Remove foreign key column first
        await queryInterface.removeColumn("porduct_list", "brand_id");

        // Then drop brands table
        await queryInterface.dropTable("brands");

        await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_brands_status";');
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_brands_type";');
    },
};
