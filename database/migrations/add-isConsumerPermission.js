"use strict";

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Add `is_consumer_permission` column
        await queryInterface.addColumn("permissions", "is_consumer_permission", {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        });
    },

    down: async (queryInterface, Sequelize) => {
        // Rollback (remove columns)
        await queryInterface.removeColumn("permissions", "is_consumer_permission");
    },
};
