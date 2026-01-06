'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('template', 'display_label_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'labels', key: 'id' },
            onDelete: 'SET NULL',
        });

        await queryInterface.addColumn('template', 'item_label_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'labels', key: 'id' },
            onDelete: 'SET NULL',
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('template', 'display_label_id');
        await queryInterface.removeColumn('template', 'item_label_id');
    },
};
