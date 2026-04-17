import { Module } from '@nestjs/common';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { ContractScannerController } from './contract-scanner.controller';
import { ContractScannerService } from './contract-scanner.service';

@Module({
  controllers: [ContractsController, ContractScannerController],
  providers: [ContractsService, ContractScannerService],
  exports: [ContractsService],
})
export class ContractsModule {}
