import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * COMMON DTOs
 */
export class OrderIdParamDto {
  @Transform(({ value }) => Number(value))
  @IsNotEmpty()
  @IsNumber()
  orderId: number;
}

export class ItemIdParamDto {
  @Transform(({ value }) => Number(value))
  @IsNotEmpty()
  @IsNumber()
  itemId: number;
}

export class InvoiceIdParamDto {
  @Transform(({ value }) => Number(value))
  @IsNotEmpty()
  @IsNumber()
  invoiceId: number;
}

/**
 * PAYMENT DTOs
 */
export class PaymentDetailsDto {
  @IsNotEmpty()
  @IsString()
  payment_method: string;

  @IsNotEmpty()
  @IsDateString()
  payment_date: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  total_amount: number;

  @IsNotEmpty()
  @IsBoolean()
  fullPayment: boolean;
}

export class MakePaymentDto {
  @Transform(({ value }) => Number(value))
  @IsNotEmpty()
  @IsNumber()
  packageOrderId: number;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => PaymentDetailsDto)
  paymentDetails: PaymentDetailsDto;
}

export class RemovePaymentDto {
  @Transform(({ value }) => Number(value))
  @IsNotEmpty()
  @IsNumber()
  paymentId: number;

  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsNumber()
  packageOrderId?: number;
}

/**
 * SHIPMENT DTOs
 */
export class ShipmentDetailDto {
  @IsNotEmpty()
  @IsDateString()
  shipment_date: string;

  @IsNotEmpty()
  @IsString()
  shipping_carrier: string;

  @IsNotEmpty()
  @IsString()
  tracking_number: string;
}

export class MakeShipmentDto {
  @Transform(({ value }) => Number(value))
  @IsNotEmpty()
  @IsNumber()
  packageOrderId: number;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ShipmentDetailDto)
  shipmentDetails?: ShipmentDetailDto[];

  @IsOptional()
  @IsBoolean()
  localPickup?: boolean = false;
}

/**
 * CLOSE ORDER DTO
 */
export class CloseOrderDto {
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  brandIds?: number[];

  @IsOptional()
  @IsString()
  closedDate?: string;
}

/**
 * MARK ALL DTO
 */
export class MarkAllDto {
  @Transform(({ value }) => Number(value))
  @IsNotEmpty()
  @IsNumber()
  packageOrderId: number;

  @IsArray()
  @IsNotEmpty()
  @IsNumber({}, { each: true })
  brandIds: number[];
}

/**
 * SHORTAGE QUANTITY DTO
 */
export class ShortageVariantDto {
  @IsNotEmpty()
  @IsString()
  size: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  receivedQuantity: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  selectedQuantity: number;
}

export class ShortageItemDto {
  @Transform(({ value }) => Number(value))
  @IsNotEmpty()
  @IsNumber()
  packageItemId: number;

  @IsOptional()
  @IsNumber()
  isItemReceived?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShortageVariantDto)
  variants: ShortageVariantDto[];
}

export class ShortageQuantityDto {
  @Transform(({ value }) => Number(value))
  @IsNotEmpty()
  @IsNumber()
  packageOrderId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShortageItemDto)
  itemsArr: ShortageItemDto[];
}

/**
 * PACKAGE SLIP DTO
 */
export class PackageSlipDto {
  @Transform(({ value }) => Number(value))
  @IsNotEmpty()
  @IsNumber()
  orderId: number;

  @IsArray()
  @IsNotEmpty()
  @IsNumber({}, { each: true })
  brandIds: number[];
}

/**
 * CUSTOM INVOICE DTOs
 */
export class BillToDetailsDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  address2?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  stateCode?: string;

  @IsOptional()
  @IsString()
  zip?: string;
}

export class InvoiceItemDto {
  @IsNotEmpty()
  @IsString()
  itemName: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CustomInvoiceDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => BillToDetailsDto)
  billToDetails: BillToDetailsDto;

  @IsNotEmpty()
  @IsDateString()
  invoiceDate: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  receivedAmount?: number;

  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  invoiceItems: InvoiceItemDto[];
}

/**
 * SAVE PDF DTO
 */
export class SavePdfDto {
  @IsNotEmpty()
  @IsString()
  pdfUrl: string;

  @Transform(({ value }) => Number(value))
  @IsNotEmpty()
  @IsNumber()
  invoiceId: number;
}

/**
 * COMPLETE PACKAGE DTO
 */
export class CompletePkgDto {
  @IsOptional()
  @IsString()
  pDate?: string;

  @IsOptional()
  @IsString()
  storeId?: string;
}

/**
 * INVOICE LIST QUERY DTO
 */
export class InvoiceListQueryDto {
  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsNumber()
  limit?: number = 10;
}
