import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'orders',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
})
export class Orders extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.BIGINT,
    field: 'order_id',
  })
  declare id: number;

  @Column({ type: DataType.STRING })
  declare channel: string;

  @Column({ type: DataType.STRING, field: 'delivery_method' })
  declare deliveryMethod: string;

  @Column({ type: DataType.STRING, field: 'delivery_status' })
  declare deliveryStatus: string;

  @Column({ type: DataType.STRING, field: 'fulfillment_status' })
  declare fulfillmentStatus: string;

  @Column({ type: DataType.INTEGER, field: 'item_count' })
  declare itemCount: number;

  @Column({ type: DataType.TEXT, field: 'order_note' })
  declare orderNote: string;

  @Column({ type: DataType.STRING, field: 'order_number' })
  declare orderNumber: string;

  @Column({ type: DataType.STRING, field: 'order_source' })
  declare orderSource: string;

  @Column({ type: DataType.STRING, field: 'payment_status' })
  declare paymentStatus: string;

  @Column({ type: DataType.BIGINT, field: 'shopify_order_id' })
  declare shopifyOrderId: number;

  @Column({ type: DataType.INTEGER, field: 'store_id' })
  declare storeId: number;

  @Column({ type: DataType.STRING })
  declare tags: string;

  @Column({ type: DataType.DOUBLE, field: 'total_price' })
  declare totalPrice: number;

  @Column({ type: DataType.BIGINT, field: 'billing_address_id' })
  declare billingAddressId: number;

  @Column({ type: DataType.INTEGER, field: 'customer_id' })
  declare customerId: number;

  @Column({ type: DataType.BIGINT, field: 'shipping_address_id' })
  declare shippingAddressId: number;

  @Column({ type: DataType.STRING, field: 'order_status' })
  declare orderStatus: string;

  @Column({ type: DataType.DECIMAL(19, 2), field: 'final_price' })
  declare finalPrice: number;

  @Column({ type: DataType.INTEGER, field: 'order_discount_type' })
  declare orderDiscountType: number;

  @Column({ type: DataType.DECIMAL(19, 2), field: 'order_discount_value' })
  declare orderDiscountValue: number;

  @Column({ type: DataType.DECIMAL(19, 2), field: 'total_discount' })
  declare totalDiscount: number;

  @Column({ type: DataType.STRING, allowNull: false, field: 'order_type' })
  declare orderType: string;

  @Column({ type: DataType.STRING, field: 'financial_status' })
  declare financialStatus: string;

  @Column({ type: DataType.DATE(6), field: 'due_date' })
  declare dueDate: Date;

  @Column({ type: DataType.DATE(6), field: 'issue_date' })
  declare issueDate: Date;

  @Column({ type: DataType.BOOLEAN, field: 'payment_due_later' })
  declare paymentDueLater: boolean;

  @Column({ type: DataType.STRING, field: 'payment_terms' })
  declare paymentTerms: string;

  @Column({ type: DataType.DECIMAL(19, 2), field: 'shipping_amount' })
  declare shippingAmount: number;

  @Column({ type: DataType.STRING, field: 'shipping_name' })
  declare shippingName: string;

  @Column({ type: DataType.STRING, field: 'store_order_id' })
  declare storeOrderId: string;

  @Column({ type: DataType.DECIMAL(19, 2), field: 'balance_amount' })
  declare balanceAmount: number;

  @Column({ type: DataType.DECIMAL(19, 2), field: 'paid_amount' })
  declare paidAmount: number;

  @Column({ type: DataType.STRING, field: 'discount_reason' })
  declare discountReason: string;

  @Column({ type: DataType.STRING })
  declare mode: string;

  @Column({ type: DataType.TEXT, field: 'shopify_order_note' })
  declare shopifyOrderNote: string;

  @Column({ type: DataType.TEXT, field: 'manual_order_note' })
  declare manualOrderNote: string;

  @Column({ type: DataType.TEXT, field: 'reason_for_cancel' })
  declare reasonForCancel: string;

  @Column({ type: DataType.TEXT, field: 'reason_for_edit' })
  declare reasonForEdit: string;

  @Column({ type: DataType.DECIMAL(19, 2), field: 'refund_owed' })
  declare refundOwed: number;

  @Column({ type: DataType.TEXT, field: 'staff_note' })
  declare staffNote: string;

  @Column({ type: DataType.BIGINT, field: 'channel_id' })
  declare channelId: number;

  @Column({ type: DataType.BOOLEAN, field: 'inventory_reverted' })
  declare inventoryReverted: boolean;

  @Column({ type: DataType.INTEGER, field: 'fulfillment_sequence' })
  declare fulfillmentSequence: number;

  @Column({ type: DataType.STRING, field: 'discountReason' })
  declare discountReasonJpa: string;

  @Column({ type: DataType.INTEGER, field: 'orderDiscountType' })
  declare orderDiscountTypeJpa: number;

  @Column({ type: DataType.DECIMAL(19, 2), field: 'orderDiscountValue' })
  declare orderDiscountValueJpa: number;

  @Column({ type: DataType.DECIMAL(19, 2), field: 'shippingAmount' })
  declare shippingAmountJpa: number;

  @Column({ type: DataType.STRING, field: 'shippingName' })
  declare shippingNameJpa: string;

  @Column({ type: DataType.DATE(6), field: 'dueDate' })
  declare dueDateJpa: Date;

  @Column({ type: DataType.DATE(6), field: 'issueDate' })
  declare issueDateJpa: Date;

  @Column({ type: DataType.BOOLEAN, field: 'paymentDueLater' })
  declare paymentDueLaterJpa: boolean;

  @Column({ type: DataType.STRING, field: 'paymentTerms' })
  declare paymentTermsJpa: string;
}
