export async function generateOrderId({
  storeId,
  prefix,
  numberLength = 5,
  fieldName = 'order_id',
  model,
  transaction,
}: {
  storeId: number;
  prefix: string;
  numberLength?: number;
  fieldName?: string;
  model: any;
  transaction?: any;
}) {
  if (!prefix || typeof prefix !== 'string') {
    throw new Error('Prefix must be a non-empty string');
  }

  if (!Number.isInteger(numberLength) || numberLength <= 0) {
    throw new Error('numberLength must be a positive integer');
  }

  if (!model) {
    throw new Error('Model is required');
  }

  // Find the last order in the database
  const lastOrder = await model.findOne({
    where: {
      store_id: storeId,
    },
    order: [['createdAt', 'DESC']],
    attributes: [fieldName],
    transaction,
    lock: transaction?.LOCK?.UPDATE,
  });

  let nextNumber = 1;

  if (lastOrder && lastOrder[fieldName]) {
    // Extract numeric part from the last order ID
    const lastNumberStr = lastOrder[fieldName].replace(prefix, '');
    const lastNumber = parseInt(lastNumberStr, 10);

    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  // Format the number with leading zeros
  const paddedNumber = String(nextNumber).padStart(numberLength, '0');

  return `${prefix}${paddedNumber}`;
}
