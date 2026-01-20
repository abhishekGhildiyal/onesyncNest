export interface getUser {
  userId: string | number;
  email: string;
  fullName: string;
  permissions: any;
  roleId: string | number;
  roleName: string;
  storeId: string | number;
  isConsumer: boolean;
  token: string;
}
