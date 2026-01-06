"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        // Add the column
        await queryInterface.addColumn("users", "user_address2", {
            type: Sequelize.STRING,
            allowNull: true,
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn("users", "user_address2");
    },
};
