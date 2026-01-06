'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // Add the column

        await queryInterface.addColumn('user_store_role', 'is_sales_agent', {
            type: Sequelize.BOOLEAN,
            allowNull: true,
            defaultValue: false,
        });

        await queryInterface.addColumn('user_store_role', 'is_logistic_agent', {
            type: Sequelize.BOOLEAN,
            allowNull: true,
            defaultValue: false,
        });

        await queryInterface.addColumn('PackageOrders', 'sales_agent_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'user_id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('user_store_role', 'is_sales_agent');
        await queryInterface.removeColumn('user_store_role', 'is_logistic_agent');
        await queryInterface.removeColumn('PackageOrders', 'sales_agent_id');
    },
};
