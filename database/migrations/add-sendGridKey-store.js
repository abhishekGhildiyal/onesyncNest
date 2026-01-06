"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        // Add the column
        await queryInterface.addColumn("stores", "sendgridApiKey", {
            type: Sequelize.STRING,
            allowNull: true,
        });

        // Add the column
        await queryInterface.addColumn("stores", "sendgridFromEmail", {
            type: Sequelize.STRING,
            allowNull: true,
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn("stores", "sendgridApiKey");

        await queryInterface.removeColumn("stores", "sendgridFromEmail");
    },
};
