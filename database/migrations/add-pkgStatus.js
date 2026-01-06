"use strict";

const { PACKAGE_STATUS } = require("../constants/enum");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.changeColumn("PackageOrders", "status", {
            type: Sequelize.ENUM(...Object.values(PACKAGE_STATUS)),
            allowNull: false,
            defaultValue: PACKAGE_STATUS.CREATED,
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.changeColumn("PackageOrders", "status", {
            type: Sequelize.ENUM(...Object.values(PACKAGE_STATUS)),
            allowNull: false,
            defaultValue: PACKAGE_STATUS.CREATED,
        });
    },
};
