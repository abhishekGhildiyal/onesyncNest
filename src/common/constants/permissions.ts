export const ROLES = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'ADMIN',
  CONSIGNER: 'Consigner',
  CONSUMER: 'Consumer',
};

export const PERMISSIONS = {
  ConsumerOrders: { name: 'Consumer Orders', isSuperAdminPermission: false, is_consumer_permission: true },
  AccessOrder: { name: 'Access list', isSuperAdminPermission: false, is_consumer_permission: true },
  OpenRequest: { name: 'Open Orders', isSuperAdminPermission: false, is_consumer_permission: true },
  InReview: { name: 'In review', isSuperAdminPermission: false, is_consumer_permission: true },
  ReadyToProccess: { name: 'Ready to Process', isSuperAdminPermission: false, is_consumer_permission: true },
  Completed: { name: 'Completed Orders', isSuperAdminPermission: false, is_consumer_permission: true },
};
