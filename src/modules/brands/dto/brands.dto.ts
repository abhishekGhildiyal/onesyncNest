import { IsNumber, IsString, IsArray, IsOptional, IsEnum, IsBoolean, IsEmail } from 'class-validator';
import { BRAND_TYPE } from '../../../common/constants/enum';

export class BrandProductsDto {
  @IsNumber({}, { each: true })
  @IsArray()
  brandIds: number[];

  @IsNumber()
  packageOrderId: number;
}

export class BrandUpdateDto {
  @IsNumber()
  id: number;

  @IsEnum(BRAND_TYPE)
  type: BRAND_TYPE;
}

export class CreatePackageDto {
  @IsString()
  packageName: string;

  @IsNumber({}, { each: true })
  @IsArray()
  brandIds: number[];

  @IsOptional()
  @IsBoolean()
  copyItems?: boolean;

  @IsOptional()
  @IsNumber()
  copyFromPackageId?: number;
}

export class LinkCustomerDto {
  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsNumber()
  packageId: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  zip?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  businessName?: string;
}

export class UpdatePackageDto {
  @IsNumber()
  packageId: number;

  @IsArray()
  items: any[];
}

export class RevokeAccessDto {
  @IsNumber()
  packageId: number;

  @IsNumber()
  customerId: number;
}
