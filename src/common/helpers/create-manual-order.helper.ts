import { BadRequestException, Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { PackageRepository } from 'src/db/repository/package.repository';
import { ProductRepository } from 'src/db/repository/product.repository';
import { StoreRepository } from 'src/db/repository/store.repository';
import { UserRepository } from 'src/db/repository/user.repository';
import { TemplatesSlug } from '../../modules/mail/mail.constants';
import { MailService } from '../../modules/mail/mail.service';
import { PACKAGE_STATUS, PAYMENT_STATUS } from '../constants/enum';
import { AllMessages } from '../constants/messages';
import { generateAlphaNumericPassword, hashPasswordMD5 } from './hash.helper';
import { generateOrderId } from './order-generator.helper';

@Injectable()
export class ManualOrderHelperService {
  constructor(
    private readonly pkgRepo: PackageRepository,
    private readonly userRepo: UserRepository,
    private readonly productRepo: ProductRepository,
    private readonly storeRepo: StoreRepository,
    private readonly mailService: MailService,
  ) {}

  async createManualOrderHelper({
    accessPackageId,
    userId,
    emails = [],
    brands = [],
    date,
    customerDetail,
    transaction: t,
  }: {
    accessPackageId: number;
    userId: number;
    emails: string[];
    brands: any[];
    date: Date;
    customerDetail: any;
    transaction: any;
  }) {
    // Fetch Access Package Order just to get base info
    const accessOrder = await this.pkgRepo.accessPackageOrderModel.findByPk(
      accessPackageId,
      {
        transaction: t,
      },
    );

    if (!accessOrder) {
      throw new BadRequestException(AllMessages.PAKG_NF);
    }

    const store = await this.storeRepo.storeModel.findByPk(
      accessOrder.store_id,
      {
        attributes: ['store_code', 'store_name', 'store_id', 'store_icon'],
        transaction: t,
      },
    );

    if (!store) {
      throw new BadRequestException('Store not found.');
    }

    // Create manual package order
    const orderId = await generateOrderId({
      storeId: store.store_id,
      prefix: store.store_code,
      model: this.pkgRepo.packageOrderModel,
      transaction: t,
    });

    const packageOrder = await this.pkgRepo.packageOrderModel.create(
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

    const existingUsers = await this.userRepo.userModel.findAll({
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

    const newUserEmails = lowerEmails.filter(
      (email) => !emailToUserMap.has(email),
    );

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
      const createdUsers = await this.userRepo.userModel.bulkCreate(
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

          await this.userRepo.userModel.update(
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

          await this.pkgRepo.consumerShippingModel.create(
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

    const [consumerRole] = await this.userRepo.roleModel.findOrCreate({
      where: { roleName: 'Consumer' },
      defaults: { roleName: 'Consumer', status: true } as any,
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

    const existingMappings = await this.userRepo.userStoreMappingModel.findAll({
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
      await this.userRepo.userStoreMappingModel.bulkCreate(newMappings, {
        transaction: t,
      });
    }

    const existingCustomers = await this.pkgRepo.packageCustomerModel.findAll({
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
      await this.pkgRepo.packageCustomerModel.bulkCreate(
        newPackageCustomerEntries,
        {
          transaction: t,
          ignoreDuplicates: true,
        },
      );
    }

    /**
     * ----------------------------
     * Step 6: Insert Brands/Items (use frontend payload)
     * ----------------------------
     */
    // Validate brand IDs
    const brandIds = brands.map((b) => b.brand_id).filter(Boolean);
    const validBrands = await this.productRepo.brandModel.findAll({
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

    const packageBrands = await this.pkgRepo.packageBrandModel.bulkCreate(
      brandPayload,
      {
        transaction: t,
        returning: true,
      },
    );

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
    const createdItems = await this.pkgRepo.packageBrandItemsModel.bulkCreate(
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
      await this.pkgRepo.packageBrandItemsCapacityModel.bulkCreate(
        finalVariantInsert,
        {
          transaction: t,
        },
      );
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
      await this.pkgRepo.packageBrandItemsQtyModel.bulkCreate(finalSizeInsert, {
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
          password: isNew
            ? (user as any).plainPassword
            : 'Your existing password',
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

            const { html, subject } = this.mailService.getPopulatedTemplate(
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

            return this.mailService.sendMail(data.to, finalHtml, subject);
          } catch (err) {
            if (data) {
              console.error(
                `❌ Email send failed for ${data.to}:`,
                err.message,
              );
              return { success: false, to: data.to, error: err.message } as any;
            }
            return {
              success: false,
              to: 'unknown',
              error: err.message,
            } as any;
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
  }
}
