import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from 'src/db/database.module';
import { AgentGuard } from './agent.guard';
import { ConsumerGuard } from './consumer.guard';
import { PermissionGuard } from './permission.guard';
import { StoreAdminGuard } from './store-admin.guard';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [AgentGuard, PermissionGuard, ConsumerGuard, StoreAdminGuard],
  exports: [AgentGuard, PermissionGuard, ConsumerGuard, StoreAdminGuard],
})
export class GuardsModule {}
