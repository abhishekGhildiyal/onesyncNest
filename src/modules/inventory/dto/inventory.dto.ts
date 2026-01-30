import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min, IsIn as ValidateIsIn } from 'class-validator';

/**
 * GET ALL INVENTORY
 */
export class GetAllInventoryDto {
  @IsOptional()
  @Transform(({ value }) => String(value))
  page?: string = '1';

  @IsOptional()
  @Transform(({ value }) => String(value))
  limit?: string = '10';

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
  @Transform(({ value }) => (value === 'null' || value === '' ? 'newest' : (value ?? 'newest')))
  @IsIn(['newest', 'oldest', 'name_asc', 'name_desc'], {
    message: 'Sort must be newest, oldest, name_asc, name_desc',
  })
  sort?: 'newest' | 'oldest' | 'name_asc' | 'name_desc';

  @IsOptional()
  @IsNumber()
  brand?: number;
}

/**
 * CONSUMER PRODUCTS
 */
export class ConsumerProductsDto {
  @IsOptional()
  @Transform(({ value }) => String(value))
  page?: string = '1';

  @IsOptional()
  @Transform(({ value }) => String(value))
  limit?: string = '10';
}

/**
 * PRODUCT VARIANTS
 */
export class ProductVariantsDto {
  @IsNotEmpty({ message: 'Product ID is required' })
  @IsString()
  productId: string;
}

/**
 * HYPER ADD INVENTORY
 */
export class HyperAddInventoryDto {
  @IsNotEmpty({ message: 'Product ID is required' })
  @IsString()
  productId: string;

  @IsNotEmpty({ message: 'Size is required' })
  @IsString()
  size: string;

  @IsNotEmpty({ message: 'Action is required' })
  @ValidateIsIn(['add', 'remove'], { message: "Action must be 'add' or 'remove'" })
  action: 'add' | 'remove';

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(1, { message: 'Count must be at least 1' })
  count?: number = 1;
}
