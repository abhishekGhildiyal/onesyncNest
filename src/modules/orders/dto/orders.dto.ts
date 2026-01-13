import { IsNumber, IsOptional, IsString } from 'class-validator';

export class StoreOrderDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsNumber() page?: number;
  @IsOptional() @IsNumber() limit?: number;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() paymentStatus?: string;
  @IsOptional() @IsString() salesAgentId?: string;
  @IsOptional() @IsString() logisticAgentId?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() sDate?: string;
  @IsOptional() eDate?: string;
}
