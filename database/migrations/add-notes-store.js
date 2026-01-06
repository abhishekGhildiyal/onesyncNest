"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        // Add the column
        await queryInterface.addColumn("PackageOrders", "notes", {
            type: Sequelize.STRING,
            allowNull: true,
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn("PackageOrders", "notes");
    },
};
