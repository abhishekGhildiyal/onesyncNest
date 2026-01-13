// const { DataTypes } = require('sequelize');
// const { sequelize } = require('../../connection');

// const PackageInvoiceMapping = sequelize.define(
//     'invoice_package_mapping',
//     {
//         id: {
//             type: DataTypes.INTEGER,
//             autoIncrement: true,
//             primaryKey: true,
//         },
//         invoice_id: {
//             type: DataTypes.INTEGER,
//             allowNull: false,
//             references: {
//                 model: 'invoices',
//                 key: 'id',
//             },
//             onDelete: 'CASCADE',
//             onUpdate: 'CASCADE',
//         },
//         package_id: {
//             type: DataTypes.INTEGER,
//             allowNull: false,
//             references: {
//                 model: 'PackageOrders',
//                 key: 'id',
//             },
//             onDelete: 'CASCADE',
//             onUpdate: 'CASCADE',
//         },
//     },
//     {
//         timestamps: true,
//     }
// );

// module.exports = { PackageInvoiceMapping };
