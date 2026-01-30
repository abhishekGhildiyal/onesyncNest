import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { BRAND_TYPE } from 'src/common/constants/enum';

/* =========================
   GET BRANDS
========================= */
export class GetBrandsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sort?: 'ASC' | 'DESC';
}

/* =========================
   BRAND UPDATE
========================= */
export class BrandUpdateDto {
  @IsInt()
  brandId: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  brandName?: string;

  @IsOptional()
  @IsIn(Object.values(BRAND_TYPE))
  type?: BRAND_TYPE;
}

/* =========================
   BRAND PRODUCTS
========================= */
export class BrandProductsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  brandIds: number[];
}

/* =========================
   CREATE PACKAGE
========================= */
class PackageVariantDto {
  @IsInt()
  variantId: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxCapacity?: number;
}

class PackageItemDto {
  @IsInt()
  product_id: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackageVariantDto)
  variants?: PackageVariantDto[];
}

class PackageBrandDto {
  @IsInt()
  brand_id: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PackageItemDto)
  items: PackageItemDto[];
}

export class CreatePackageDto {
  @IsString()
  packageName: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PackageBrandDto)
  brands: PackageBrandDto[];

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  customers?: string[];
}

/* =========================
   LINK CUSTOMER
========================= */
export class LinkCustomerDto {
  @IsInt()
  packageOrderId: number;

  @IsArray()
  @ArrayMinSize(1)
  @Transform(({ value }) => value.map((email: string) => email.toLowerCase().trim()))
  @IsEmail({}, { each: true })
  customers: string[];

  @IsOptional()
  @IsBoolean()
  showPrices?: boolean;
}

/* =========================
   ALL CUSTOMERS
========================= */
export class AllCustomersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  linked?: boolean;
}

/* =========================
   PARAM ID
========================= */
export class PackageIdParamDto {
  @IsNotEmpty()
  packageId: number | string;
}

export class OrderIdParamDto {
  @IsNotEmpty()
  orderId: number | string;
}

/* =========================
   REVOKE ACCESS
========================= */
export class RevokeAccessDto {
  @IsInt()
  package_id: number;

  @IsInt()
  customer_id: number;
}
