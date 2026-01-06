"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        // Add the column
        await queryInterface.addColumn("variant", "is_consumer_order", {
            type: Sequelize.BOOLEAN,
            allowNull: true,
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn("variant", "is_consumer_order");
    },
};
