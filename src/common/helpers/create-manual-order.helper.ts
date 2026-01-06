import {
  BadRequestException,
} from '@nestjs/common';
import { Op } from 'sequelize';
import { PackageOrder } from '../../modules/packages/entities/package-order.entity';
import { PackageBrand } from '../../modules/packages/entities/package-brand.entity';
import { PackageBrandItems } from '../../modules/packages/entities/package-brand-items.entity';
import { PackageBrandItemsCapacity } from '../../modules/packages/entities/package-brand-item-capacity.entity';
import { PackageBrandItemsQty } from '../../modules/packages/entities/package-brand-item-qty.entity';
import { PackageCustomer } from '../../modules/packages/entities/package-customer.entity';
import { User } from '../../modules/users/entities/user.entity';
import { Role } from '../../modules/users/entities/role.entity';
import { UserStoreMapping } from '../../modules/users/entities/user-store-mapping.entity';
import { Store } from '../../modules/users/entities/store.entity';
import { Brand } from '../../modules/products/entities/brand.entity';
import { ConsumerShippingAddress } from '../../modules/users/entities/consumer-shipping-address.entity';
import { AccessPackageOrder } from '../../modules/products/entities/access-package-order.entity';

import {
  generateAlphaNumericPassword,
  hashPasswordMD5,
} from './hash.helper';
import { generateOrderId } from './order-generator.helper';
import { PACKAGE_STATUS, PAYMENT_STATUS } from '../constants/enum';
import { AllMessages } from '../constants/messages';
import { TemplatesSlug } from '../../modules/mail/mail.constants';
import { MailService } from '../../modules/mail/mail.service';

export const createManualOrderHelper = async ({
  accessPackageId,
  userId,
  emails = [],
  brands = [],
  date,
  customerDetail,
  transaction: t,
  mailService,
}: {
  accessPackageId: number;
  userId: number;
  emails: string[];
  brands: any[];
  date: Date;
  customerDetail: any;
  transaction: any;
  mailService: MailService;
}) => {
  // Fetch Access Package Order just to get base info
  const accessOrder = await AccessPackageOrder.findByPk(accessPackageId, {
    transaction: t,
  });

  if (!accessOrder) {
    throw new BadRequestException(AllMessages.PAKG_NF);
  }

  const store = await Store.findByPk(accessOrder.store_id, {
    attributes: ['store_code', 'store_name', 'store_id', 'store_icon'],
    transaction: t,
  });

  if (!store) {
    throw new BadRequestException('Store not found.');
  }

  // Create manual package order
  const orderId = await generateOrderId({
    storeId: store.store_id,
    prefix: store.store_code,
    model: PackageOrder,
    transaction: t,
  });

  const packageOrder = await PackageOrder.create(
    {
      packageName: accessOrder.packageName,
      user_id: userId,
      order_id: orderId,
      store_id: accessOrder.store_id,
      status: PACKAGE_STATUS.CONFIRM,
      paymentStatus: PAYMENT_STATUS.PENDING,
      shipmentStatus: false,
      isManualOrder: true,
      statusChangeDate: date,
      employee_id: userId,
    },
    { transaction: t },
  );

  const lowerEmails = emails.map((email) => email.toLowerCase());

  const existingUsers = await User.findAll({
    where: {
      email: {
        [Op.in]: lowerEmails,
      },
    },
    transaction: t,
  });

  const emailToUserMap = new Map(
    existingUsers.map((u) => [u.email.toLowerCase(), u]),
  );

  const newUserEmails = lowerEmails.filter((email) => !emailToUserMap.has(email));

  const newUsers = newUserEmails.map((email) => {
    const plainPassword = generateAlphaNumericPassword();
    const hashedPassword = hashPasswordMD5(plainPassword);
    return {
      email,
      firstName: email.split('@')[0],
      password: hashedPassword,
      plainPassword, // keep for mailing
    };
  });

  if (newUsers.length > 0) {
    const createdUsers = await User.bulkCreate(
      newUsers.map((u) => ({
        email: u.email,
        firstName: u.firstName,
        password: u.password,
      })),
      { transaction: t, returning: true },
    );

    createdUsers.forEach((user, idx) => {
      emailToUserMap.set(user.email.toLowerCase(), {
        ...user.get({ plain: true }), // sequelize instance → plain object
        plainPassword: newUsers[idx].plainPassword,
      } as any);
    });
  }

  // Step 5: Update users with customer details if provided
  if (customerDetail) {
    const { firstName, lastName, phone, billingAddress } = customerDetail;
    if (billingAddress) {
      const { b_address, b_address2, b_country, b_city, b_state, b_zip } =
        billingAddress;

      for (const email of lowerEmails) {
        const user = emailToUserMap.get(email);
        if (!user) continue;

        await User.update(
          {
            firstName: firstName || user.firstName,
            lastName: lastName || user.lastName,
            phnNo: phone || user.phnNo,
            address: b_address,
            address2: b_address2,
            country: b_country,
            city: b_city,
            state: b_state,
            zip: b_zip,
          },
          { where: { id: user.id }, transaction: t },
        );

        // await ConsumerShippingAddressModel.destroy({ where: { consumerId: user.id } }, { transaction: t });
        await ConsumerShippingAddress.create(
          {
            label: 'Same as Billing',
            consumerId: user.id,
            address: b_address,
            address2: b_address2,
            country: b_country,
            city: b_city,
            state: b_state,
            zip: b_zip,
            selected: true,
            sameAddress: true,
          },
          { transaction: t },
        );
      }
    }
  }

  const [consumerRole] = await Role.findOrCreate({
    where: { roleName: 'Consumer' },
    defaults: { roleName: 'Consumer', status: true }, // Verify status type (boolean or number)
    transaction: t,
  });

  const userMappings: any[] = [];
  const packageCustomerEntries: any[] = [];

  for (const email of lowerEmails) {
    const user = emailToUserMap.get(email);
    if (!user) continue;

    userMappings.push({
      userId: user.id,
      roleId: consumerRole.roleId,
      storeId: accessOrder.store_id,
      status: true,
    });

    packageCustomerEntries.push({
      package_id: packageOrder.id,
      customer_id: user.id,
    });
  }

  const existingMappings = await UserStoreMapping.findAll({
    where: {
      userId: userMappings.map((m) => m.userId),
      roleId: consumerRole.roleId,
      storeId: accessOrder.store_id,
    },
    transaction: t,
  });

  const existingUserIds = new Set(existingMappings.map((m) => m.userId));
  const newMappings = userMappings.filter(
    (m) => !existingUserIds.has(m.userId),
  );

  if (newMappings.length > 0) {
    await UserStoreMapping.bulkCreate(newMappings, { transaction: t });
  }

  const existingCustomers = await PackageCustomer.findAll({
    where: {
      package_id: packageOrder.id,
      customer_id: packageCustomerEntries.map((e) => e.customer_id),
    },
    transaction: t,
  });

  const existingCustomerSet = new Set(
    existingCustomers.map((e) => `${e.package_id}-${e.customer_id}`),
  );
  const newPackageCustomerEntries = packageCustomerEntries.filter(
    (e) => !existingCustomerSet.has(`${e.package_id}-${e.customer_id}`),
  );

  if (newPackageCustomerEntries.length > 0) {
    await PackageCustomer.bulkCreate(newPackageCustomerEntries, {
      transaction: t,
      ignoreDuplicates: true,
    });
  }

  /**
   * ----------------------------
   * Step 6: Insert Brands/Items (use frontend payload)
   * ----------------------------
   */
  // Validate brand IDs
  const brandIds = brands.map((b) => b.brand_id).filter(Boolean);
  const validBrands = await Brand.findAll({
    where: { id: brandIds },
    transaction: t,
  });
  const brandIdSet = new Set(validBrands.map((b) => b.id));

  // Create brands
  const brandPayload = brands
    .filter((b) => brandIdSet.has(b.brand_id) && b.items?.length > 0)
    .map((b) => ({
      package_id: packageOrder.id,
      brand_id: b.brand_id,
      selected: true,
    }));

  const packageBrands = await PackageBrand.bulkCreate(brandPayload, {
    transaction: t,
    returning: true,
  });

  const brandIdToPkgBrandId = new Map();
  packageBrands.forEach((b) => brandIdToPkgBrandId.set(b.brand_id, b.id));

  const itemRecords: any[] = [];
  const variantRecords: any[] = [];
  const sizeQtyArr: any[] = [];

  for (const brand of brands) {
    if (!brandIdSet.has(brand.brand_id)) continue;

    const packageBrandId = brandIdToPkgBrandId.get(brand.brand_id);

    for (const item of brand.items || []) {
      const { product_id, variants = [], mainVariants = [] } = item;
      if (!product_id) continue;

      const tempId = `${packageBrandId}-${product_id}-${Math.random()}`;

      itemRecords.push({
        tempId,
        packageBrand_id: packageBrandId,
        product_id,
        quantity: null,
      });

      variantRecords.push(
        ...variants
          .filter((v) => v.variantId)
          .map((v) => ({
            tempId,
            variant_id: v.variantId,
            maxCapacity: v.maxCapacity || null,
          })),
      );

      sizeQtyArr.push(
        ...mainVariants.map((x) => ({
          tempId,
          variant_size: x.size,
          maxCapacity: x.quantity || null,
        })),
      );
    }
  }

  // Insert items
  const createdItems = await PackageBrandItems.bulkCreate(
    itemRecords.map((r) => ({
      packageBrand_id: r.packageBrand_id,
      product_id: r.product_id,
      quantity: r.quantity,
    })),
    { transaction: t, returning: true },
  );

  const tempIdToItemId = new Map();
  for (const item of createdItems) {
    const match = itemRecords.find(
      (r) =>
        r.packageBrand_id === item.packageBrand_id &&
        r.product_id === item.product_id &&
        r.quantity === item.quantity,
    );
    if (match) {
      tempIdToItemId.set(match.tempId, item.id);
    }
  }

  // Insert capacities
  const finalVariantInsert = variantRecords
    .map((v) => ({
      item_id: tempIdToItemId.get(v.tempId),
      variant_id: v.variant_id,
      maxCapacity: v.maxCapacity,
    }))
    .filter((x) => !!x.item_id);

  if (finalVariantInsert.length > 0) {
    await PackageBrandItemsCapacity.bulkCreate(finalVariantInsert, {
      transaction: t,
    });
  }

  // Insert size/qty
  const finalSizeInsert = sizeQtyArr
    .map((x) => ({
      item_id: tempIdToItemId.get(x.tempId),
      variant_size: x.variant_size,
      maxCapacity: x.maxCapacity,
    }))
    .filter((x) => !!x.item_id);

  if (finalSizeInsert.length > 0) {
    await PackageBrandItemsQty.bulkCreate(finalSizeInsert, {
      transaction: t,
    });
  }

  /**
   * ----------------------------
   * Send mail to new users with their credentials
   * ----------------------------
   */
  const mailPayloads = lowerEmails
    .map((email) => {
      const user = emailToUserMap.get(email);
      if (!user) return null;

      const isNew = newUserEmails.includes(email);

      return {
        to: email,
        isNew,
        userEmail: email,
        password: isNew ? (user as any).plainPassword : 'Your existing password',
        // orderNo: packageOrder.order_id,
        storeName: store.store_name,
        storeLogo: store.store_icon,
        frontendURL: process.env.FRONTEND_URL,
        supportEmail: process.env.SUPPORT_EMAIL,
        project: process.env.PROJECT_NAME,
      };
    })
    .filter(Boolean);

  // Only new users for now based on legacy logic filter
  const newUserMailPayloads = mailPayloads.filter((m) => m && m.isNew);

  // Send mails asynchronously without awaiting to avoid blocking response
  setImmediate(() => {
    Promise.all(
      newUserMailPayloads.map(async (data) => {
        try {
          if (!data) return;
          // credentials section only for new users
          const credentialsSection = data.isNew
            ? `
                             <!-- Credentials Section -->
                                    <tr>
                                        <td align="center" style="padding: 0 20px;">
                                            <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; border: 1px solid #e0e0e0; border-radius: 10px; margin-bottom: 20px;">
                                                <tr>
                                                    <td style="padding: 15px 20px; font-size: 14px; color: #333;">
                                                        <strong>Email:</strong> ${data.userEmail}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 0 20px 15px; font-size: 14px; color: #333;">
                                                        <strong>Password:</strong> ${data.password}
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                        `
            : ``;

          const { html, subject } = mailService.getPopulatedTemplate(
            TemplatesSlug.ManualOrderNewUser,
            {
              frontendURL: data.frontendURL,
              // orderNo: data.orderNo,
              storeName: data.storeName,
              userEmail: data.userEmail,
              password: data.password,
              supportEmail: data.supportEmail,
              project: data.project,
              oneSyncLogo: process.env.ONE_SYNC_LOGO,
              storeLogo: data.storeLogo,
            },
          );

          const finalHtml = html.replace(
            /<!-- CREDENTIALS_PLACEHOLDER -->/g,
            credentialsSection,
          );

          return mailService.sendMail(data.to, finalHtml, subject);
        } catch (err) {
          if (data) {
             console.error(`❌ Email send failed for ${data.to}:`, err.message);
             return { success: false, to: data.to, error: err.message };
          }
          return { success: false, to: 'unknown', error: err.message };
        }
      }),
    )
      .then((results) => {
        const failed = results.filter((r) => r && r.success === false);
        if (failed.length) {
          console.warn(`❌ ${failed.length} email(s) failed:`);
          failed.forEach((f) => {
             if (f) console.warn(` ↳ ${f.to}: ${f.error}`);
          });
        }
      })
      .catch((err) => {
        console.error('❌ Unexpected mail error:', err);
      });
  });

  return packageOrder;
};
