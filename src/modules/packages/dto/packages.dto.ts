import { IsNumber, IsString, IsArray, IsOptional, IsBoolean } from 'class-validator';

export class MakePaymentDto {
  @IsNumber()
  packageOrderId: number;

  @IsNumber()
  received_amount: number;

  @IsString()
  payment_method: string;

  @IsString()
  payment_date: string;
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
  pDate: string;

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
