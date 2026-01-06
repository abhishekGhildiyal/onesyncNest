import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsEmail } from 'class-validator';

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
  @IsString()
  name: string;

  @IsString()
  templateData: string;

  @IsString()
  label: string;

  @IsString()
  type: string;
}

export class UpdateLabelTemplateDto {
  @IsNumber()
  id: number;

  @IsString()
  name: string;

  @IsString()
  templateData: string;

  @IsString()
  label: string;

  @IsString()
  type: string;
}
