import { Invoice, Store, User } from '../entities';

export const invoiceAssociations = () => {
  Invoice.belongsTo(User, {
    foreignKey: 'consumer_id',
    as: 'consumer',
  });

  // 🧩 Invoice belongs to a store
  Invoice.belongsTo(Store, {
    foreignKey: 'store_id',
    as: 'store',
  });

  // // 🧩 Invoice has many mappings (bridge table entries)
  // Invoice .hasMany(PackageInvoiceMapping, {
  //     foreignKey: "invoice_id",
  //     as: "packageMappings",
  // });

  // // 🧩 PackageInvoiceMapping belongs to Invoice
  // PackageInvoiceMapping.belongsTo(Invoice , {
  //     foreignKey: "invoice_id",
  //     as: "invoice",
  // });

  // // 🧩 PackageInvoiceMapping belongs to PackageOrder
  // PackageInvoiceMapping.belongsTo(PackageOrder , {
  //     foreignKey: "package_id",
  //     as: "packageOrder",
  // });

  // // 🧩 If you want to directly access all packages under an invoice:
  // Invoice .belongsToMany(PackageOrder , {
  //     through: PackageInvoiceMapping,
  //     foreignKey: "invoice_id",
  //     otherKey: "package_id",
  //     as: "packages",
  // });

  // // 🧩 Reverse: A package can belong to multiple invoices (if allowed)
  // PackageOrder .belongsToMany(Invoice , {
  //     through: PackageInvoiceMapping,
  //     foreignKey: "package_id",
  //     otherKey: "invoice_id",
  //     as: "invoices",
  // });
};
