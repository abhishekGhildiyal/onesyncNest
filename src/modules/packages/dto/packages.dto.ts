import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class OrderIdParamDto {
  @IsNotEmpty()
  orderId: number | string;
}
class PaymentDetailsDto {
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsNotEmpty()
  @IsString()
  payment_method: string;

  @IsNotEmpty()
  payment_date: string;

  @IsNotEmpty()
  @IsNumber()
  total_amount: number;

  @IsNotEmpty()
  @IsBoolean()
  fullPayment: boolean;
}
export class MakePaymentDto {
  @IsNumber()
  packageOrderId: number;

  @IsNotEmpty()
  paymentDetails: PaymentDetailsDto;
}

export class RemovePaymentDto {
  @IsNumber()
  paymentId: number;

  @IsNumber()
  packageOrderId: number;
}

export class MakeShipmentDto {
  @IsNumber()
  packageOrderId: number;

  @IsArray()
  @IsOptional()
  shipmentDetails?: any[];

  @IsBoolean()
  @IsOptional()
  localPickup?: boolean;
}

export class CloseOrderDto {
  @IsString()
  @IsOptional()
  storeId?: string;
}

export class MarkAllDto {
  @IsArray()
  itemIds: number[];
}

export class ShortageQuantityDto {
  @IsNumber()
  itemId: number;

  @IsArray()
  shortageQuantities: any[];
}

export class PackageSlipDto {
  @IsNumber()
  orderId: number;

  @IsArray()
  @IsOptional()
  brandIds?: number[];
}

export class CustomInvoiceDto {
  @IsString()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  phnNo: string;

  @IsString()
  address: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsString()
  zip: string;

  @IsString()
  country: string;

  @IsArray()
  items: any[];
}
