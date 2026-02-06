import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { PACKAGE_STATUS, PAYMENT_STATUS } from 'src/common/constants/enum';

/* -------------------- COMMON PARAM DTOs -------------------- */

export class OrderIdParamDto {
  @IsNotEmpty()
  orderId: number | string;
}

export class OrderIdStatusParamDto {
  @IsNotEmpty()
  orderId: number | string;

  @IsOptional()
  @IsIn(Object.values({ ...PACKAGE_STATUS, access: 'access' }))
  status: PACKAGE_STATUS;
}
export class saveAsDraftDto {
  @IsNotEmpty()
  @IsNumber()
  packageId: number;

  @IsNotEmpty()
  brandData: any[];
}

export class OrderIdBrandIdParamDto {
  @IsNotEmpty()
  @IsNumber()
  orderId: number;

  @IsNotEmpty()
  @IsNumber()
  brandId: number;
}

export class AgentTypeParamDto {
  @IsNotEmpty()
  @IsIn(['sales', 'logistic'])
  type: 'sales' | 'logistic';
}

/* -------------------- ACCESS LIST -------------------- */

export class AccessListDto {
  @IsOptional()
  @IsIn(Object.values(PACKAGE_STATUS))
  status?: PACKAGE_STATUS;
}

/* -------------------- GET ORDERS -------------------- */

export class GetOrdersDto {
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsIn(Object.values(PACKAGE_STATUS))
  status?: PACKAGE_STATUS;

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsIn(Object.values(PAYMENT_STATUS))
  paymentStatus?: PAYMENT_STATUS;

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsInt()
  customerId?: number;

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsInt()
  salesAgentId?: number;

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsInt()
  logisticAgentId?: number;

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString()
  search?: string;

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  limit?: number;

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsISO8601()
  sDate?: string;

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsISO8601()
  eDate?: string;
}

/* -------------------- UPDATE QUANTITY -------------------- */

class VariantDto {
  @IsNotEmpty()
  @IsString()
  size: string;

  @IsNotEmpty()
  @IsNumber()
  quantity: number;
}

class ItemQuantityDto {
  @IsNotEmpty()
  @IsNumber()
  itemId: number;

  @IsNotEmpty()
  @IsNumber()
  totalQuantity: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants?: VariantDto[];
}

export class UpdateQuantityDto {
  @IsNotEmpty()
  @IsNumber()
  brandId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemQuantityDto)
  items: ItemQuantityDto[];

  @IsOptional()
  packageOrderId?: number | string;

  @IsOptional()
  isSearch: Boolean;
}

/* -------------------- ADD NOTES -------------------- */

export class AddNotesDto {
  @IsNotEmpty()
  @IsNumber()
  orderId: number;

  @IsNotEmpty()
  @IsString()
  notes: string;
}

/* -------------------- ASSIGN AGENT -------------------- */

export class AssignSalesAgentDto {
  @IsNotEmpty()
  @IsNumber()
  orderId: number;

  @IsNotEmpty()
  @IsNumber()
  agentId: number;

  @IsNotEmpty()
  @IsString()
  agentName: string;
}

/* -------------------- SET ITEM PRICE -------------------- */

export class SetItemPriceDto {
  @IsNotEmpty()
  packageOrderId: number | string;

  @IsNotEmpty()
  packageBrandId: number | string;

  @IsOptional()
  @IsArray()
  prices?: any[];

  @IsOptional()
  @IsArray()
  items?: any[];

  @IsOptional()
  isSearch?: Boolean;
}

/* -------------------- CREATE MANUAL ORDER -------------------- */

export class CreateManualOrderDto {
  @IsNotEmpty()
  packageId: string | number;

  @IsOptional()
  @IsArray()
  emails?: string[];

  @IsOptional()
  @IsArray()
  brandData?: any[];

  @IsNotEmpty()
  customerDetail: any;

  @IsOptional()
  @IsISO8601()
  date?: string;
}

export class ParamOrderIdBrandIdDto {
  @IsNotEmpty()
  orderId: number | string;

  @IsNotEmpty()
  brandId: number | string;
}

/* -------------------- START ORDER PROCESS -------------------- */

export class StartOrderProcessDto {
  @IsNotEmpty()
  @IsNumber()
  orderId: number;

  @IsOptional()
  @IsNumber()
  agentId?: number;

  @IsOptional()
  @IsString()
  agentName?: string;
}

/* -------------------- VARIANT COST -------------------- */

export class GetVariantCostDto {
  @IsNotEmpty()
  @IsArray()
  variantIds: number[];
}

/* -------------------- ITEM TOTAL PRICE -------------------- */

export class ItemTotalPriceDto {
  @IsNotEmpty()
  @IsNumber()
  orderId: number;

  @IsNotEmpty()
  @IsArray()
  brandIds: number[];
}

/* -------------------- CHECK STOCK -------------------- */

class StockItemDto {
  @IsNotEmpty()
  productMainId: number;

  @IsOptional()
  @IsArray()
  variants?: any[];
}

export class CheckStockDto {
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockItemDto)
  items: StockItemDto[];
}

export class SyncStockDto {
  @IsNotEmpty()
  orderId: number;

  @IsNotEmpty()
  brandId: number;

  @IsNotEmpty()
  productId: number;

  @IsNotEmpty()
  @IsArray()
  sizes: string[] | number[];
}

export class SyncFullStock {
  @IsNotEmpty()
  orderId: number;

  @IsNotEmpty()
  brandIds: string[] | number[];
}

/* -------------------- UPDATE ACCESS VARIANT QUANTITY -------------------- */

export class UpdateAccessVariantQuantityDto {
  @IsNotEmpty()
  @IsNumber()
  packageOrderId: number;

  @IsNotEmpty()
  @IsArray()
  items: any[];
}

/* -------------------- CREATE ORDER -------------------- */

export class CreateOrderDto {
  @IsNotEmpty()
  @IsNumber()
  packageOrderId: number;

  @IsOptional()
  @IsArray()
  brandIds?: number[];
}

/* -------------------- UPDATE ORDER BRANDS -------------------- */

export class UpdateOrderBrandsDto {
  @IsNotEmpty()
  @IsNumber()
  packageOrderId: number;

  @IsNotEmpty()
  @IsArray()
  brandIds: number[];
}

/* -------------------- CONFIRM ORDER -------------------- */

export class ConfirmOrderDto {
  @IsNotEmpty()
  confirmDate: string;
}
