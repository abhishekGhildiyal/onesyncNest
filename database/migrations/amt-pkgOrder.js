"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        // Add the column

        await queryInterface.addColumn("PackageOrders", "total_amount", {
            type: Sequelize.DOUBLE,
            allowNull: true,
        });

        await queryInterface.addColumn("PackageOrders", "received_amount", {
            type: Sequelize.DOUBLE,
            allowNull: true,
        });

        await queryInterface.addColumn("PackagePayments", "total_amount", {
            type: Sequelize.DOUBLE,
            allowNull: true,
        });

        await queryInterface.addColumn("PackagePayments", "received_amount", {
            type: Sequelize.DOUBLE,
            allowNull: true,
        });

        // await queryInterface.addColumn("PackagePayments", "refund_amount", {
        //     type: Sequelize.DOUBLE,
        //     allowNull: true,
        // });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn("PackageOrders", "total_amount");
        await queryInterface.removeColumn("PackageOrders", "received_amount");
        await queryInterface.removeColumn("PackagePayments", "total_amount");
        await queryInterface.removeColumn("PackagePayments", "received_amount");
        // await queryInterface.removeColumn("PackagePayments", "refund_amount");
    },
};
