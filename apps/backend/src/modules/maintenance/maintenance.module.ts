import { Module } from '@nestjs/common';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceCostsController } from './maintenance-costs.controller';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceCostsService } from './maintenance-costs.service';

@Module({
  controllers: [MaintenanceController, MaintenanceCostsController],
  providers: [MaintenanceService, MaintenanceCostsService],
  exports: [MaintenanceService, MaintenanceCostsService],
})
export class MaintenanceModule {}
