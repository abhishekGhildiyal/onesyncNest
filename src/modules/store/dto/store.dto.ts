import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class StoreAddressDto {
  @IsString()
  s_country: string;
  @IsString()
  s_address: string;
  @IsString()
  s_address2: string;
  @IsString()
  s_city: string;
  @IsString()
  s_state: string;
  @IsString()
  s_zip: string;
}

export class ShippingAddressItemDto {
  @IsOptional()
  @IsString()
  label?: string;
  @IsString()
  country: string;
  @IsString()
  address: string;
  @IsOptional()
  @IsString()
  address2?: string;
  @IsString()
  city: string;
  @IsString()
  state: string;
  @IsString()
  zip: string;
  @IsOptional()
  @IsBoolean()
  isBilling?: boolean;
  @IsOptional()
  @IsBoolean()
  sameAddress?: boolean;
  @IsOptional()
  @IsBoolean()
  selected?: boolean;
}

export class AddAddressDto {
  @IsOptional()
  storeAddress?: StoreAddressDto;

  @IsArray()
  @IsOptional()
  shippingAddress?: ShippingAddressItemDto[];
}

export class CreateSenderDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  zip?: string;

  @IsString()
  @IsOptional()
  country?: string;
}

export class EmailAndKeyDto {
  @IsString()
  apiKey: string;

  @IsEmail()
  senderEmail: string;
}

export class SaveLabelTemplateDto {
  @IsString()
  templateData: string;

  @IsString()
  label: string;

  @IsString()
  type: string;
}

export class CreateLabelTemplateDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  templateData: string;

  @IsNotEmpty()
  @IsNotEmpty()
  label: Object;

  @IsNotEmpty()
  @IsString()
  type: string;
}

export class UpdateLabelTemplateDto extends CreateLabelTemplateDto {
  @IsNotEmpty()
  @Type(() => Number)
  id: number;
}

// For getAllLabelTemplates query parameters
export class GetAllLabelTemplatesQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;

  @ApiProperty({ required: false, enum: ['product', 'inventory'] })
  @IsOptional()
  @IsString()
  type?: string;
}
