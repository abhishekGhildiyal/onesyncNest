import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * GET ALL INVENTORY
 */
export class GetAllInventoryDto {
  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  productType?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === 'null' || value === '' ? null : (value ?? 'newest'),
  )
  @IsIn(['newest', 'oldest', 'name_asc', 'name_desc'], {
    message: 'Sort must be newest, oldest, name_asc, name_desc',
  })
  sort?: 'newest' | 'oldest' | 'name_asc' | 'name_desc';

  @IsOptional()
  @IsString()
  brand?: string;
}

/**
 * CONSUMER PRODUCTS
 */
export class ConsumerProductsDto {
  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}

/**
 * PRODUCT VARIANTS
 */
export class ProductVariantsDto {
  @IsNotEmpty({ message: 'Product ID is required' })
  @IsString()
  productId: string;
}
