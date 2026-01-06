'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // Add the column
        await queryInterface.addColumn('template', 'label_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('template', 'label_id');
    },
};
