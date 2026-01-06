"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        // Add the column
        await queryInterface.addColumn("store_location_mapping", "isShipping", {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        });

        await queryInterface.addColumn("store_location_mapping", "same_address", {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        });

        // Add an index on store_id and isShipping
        await queryInterface.addIndex("store_location_mapping", ["store_id", "isShipping"], {
            name: "store_location_isShipping_idx", // custom index name
            unique: true, // set to true if you need uniqueness
        });
    },

    async down(queryInterface, Sequelize) {
        // Remove index first
        await queryInterface.removeIndex("store_location_mapping", "store_location_isShipping_idx");

        // Remove the column
        await queryInterface.removeColumn("store_location_mapping", "isShipping");
    },
};
