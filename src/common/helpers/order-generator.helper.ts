import { Op } from 'sequelize';
import { PACKAGE_STATUS } from '../constants/enum';

interface whereInterface {
  store_id: number | string;
  status?: string | object;
}

interface propsInterface {
  storeId: number | string;
  prefix: string;
  numberLength?: number;
  fieldName?: string;
  model: any;
  draft: boolean;
  transaction?: any;
}

export async function generateOrderId({
  storeId,
  prefix,
  numberLength = 5,
  fieldName = 'order_id',
  model,
  draft = false,
  transaction,
}: propsInterface) {
  if (!prefix || typeof prefix !== 'string') {
    throw new Error('Prefix must be a non-empty string');
  }

  if (!Number.isInteger(numberLength) || numberLength <= 0) {
    throw new Error('numberLength must be a positive integer');
  }

  if (!model) {
    throw new Error('Model is required');
  }

  // 👉 Add D to prefix if draft
  const effectivePrefix = draft ? `D${prefix}` : prefix;

  const whereCond: whereInterface = {
    store_id: storeId,
  };

  if (draft) {
    whereCond.status = PACKAGE_STATUS.DRAFT;
  } else {
    whereCond.status = {
      [Op.ne]: PACKAGE_STATUS.DRAFT,
    };
  }

  // Find the last order in the database
  const lastOrder = await model.findOne({
    where: whereCond,
    order: [['createdAt', 'DESC']],
    attributes: [fieldName],
    transaction,
    lock: transaction?.LOCK?.UPDATE,
  });

  let nextNumber = 1;

  if (lastOrder && lastOrder[fieldName]) {
    // Remove effective prefix (D + prefix if draft)
    const lastNumberStr = lastOrder[fieldName].replace(effectivePrefix, '');
    const lastNumber = parseInt(lastNumberStr, 10);

    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  // Format the number with leading zeros
  const paddedNumber = String(nextNumber).padStart(numberLength, '0');

  return `${effectivePrefix}${paddedNumber}`;
}
