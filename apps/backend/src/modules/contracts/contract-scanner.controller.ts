import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { ContractScannerService } from './contract-scanner.service';

@ApiTags('contracts')
@Controller('contracts')
export class ContractScannerController {
  constructor(private readonly scannerService: ContractScannerService) {}

  @Post('scan')
  @Roles('owner', 'employee')
  async scanContract(@Body() body: { image_url: string; lang?: string }) {
    return this.scannerService.scanContract(body.image_url, body.lang);
  }
}
