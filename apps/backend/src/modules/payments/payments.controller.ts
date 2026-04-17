import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { UploadReceiptDto } from './dto/upload-receipt.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { RejectPaymentDto } from './dto/reject-payment.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/current-user.decorator';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ─── GET /payments ───────────────────────────────────────────

  @Get()
  @Roles('owner', 'employee')
  @ApiOperation({
    summary: 'List payments with filters: status, tenant, unit, date range',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of payments' })
  findAll(@Query() query: QueryPaymentDto) {
    return this.paymentsService.findAll(query);
  }

  // ─── GET /payments/overdue ───────────────────────────────────
  // Must be defined BEFORE /:id to avoid route collision

  @Get('overdue')
  @Roles('owner', 'employee')
  @ApiOperation({ summary: 'List overdue payment schedules with tenant and unit info' })
  @ApiResponse({ status: 200, description: 'List of overdue payment schedules' })
  findOverdue() {
    return this.paymentsService.findOverdueSchedules();
  }

  // ─── GET /payments/schedules ─────────────────────────────────

  @Get('schedules')
  @Roles('owner', 'employee', 'tenant')
  @ApiOperation({
    summary: 'List payment schedules with filters: contract_id, status, month, year',
  })
  @ApiQuery({ name: 'contract_id', required: false })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'partial', 'paid', 'overdue', 'cancelled'],
  })
  @ApiQuery({ name: 'month', required: false, type: Number })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated list of payment schedules' })
  findAllSchedules(
    @CurrentUser() user: AuthUser,
    @Query('contract_id') contract_id?: string,
    @Query('status') status?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.paymentsService.findAllSchedules({
      contract_id,
      status,
      month: month ? parseInt(month, 10) : undefined,
      year: year ? parseInt(year, 10) : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      tenant_id: user.role === 'tenant' ? user.tenant_id : undefined,
    });
  }

  // ─── GET /payments/schedules/:id ─────────────────────────────

  @Get('schedules/:id')
  @Roles('owner', 'employee', 'tenant')
  @ApiOperation({ summary: 'Get payment schedule detail with linked payments' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Payment schedule detail' })
  @ApiResponse({ status: 403, description: 'Forbidden – tenant accessing another schedule' })
  @ApiResponse({ status: 404, description: 'Payment schedule not found' })
  findScheduleById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.paymentsService.findScheduleById(id, currentUser);
  }

  // ─── GET /payments/:id ───────────────────────────────────────

  @Get(':id')
  @Roles('owner', 'employee', 'tenant')
  @ApiOperation({ summary: 'Get payment detail with receipt URL and OCR results' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Payment detail' })
  @ApiResponse({ status: 403, description: 'Forbidden – tenant accessing another payment' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.paymentsService.findOne(id, currentUser);
  }

  // ─── POST /payments/upload-receipt ───────────────────────────

  @Post('upload-receipt')
  @Roles('owner', 'employee', 'tenant')
  @ApiOperation({
    summary:
      'Upload a receipt for a payment schedule. Runs OCR and creates a pending_review payment.',
  })
  @ApiResponse({ status: 201, description: 'Payment created with OCR results' })
  @ApiResponse({ status: 400, description: 'Schedule is cancelled or invalid' })
  @ApiResponse({ status: 403, description: 'Tenant submitting for another tenant schedule' })
  @ApiResponse({ status: 404, description: 'Payment schedule not found' })
  uploadReceipt(
    @Body() dto: UploadReceiptDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.paymentsService.uploadReceipt(dto, currentUser);
  }

  // ─── PATCH /payments/:id/confirm ─────────────────────────────

  @Patch(':id/confirm')
  @Roles('owner', 'employee')
  @ApiOperation({
    summary:
      'Confirm a pending_review payment. Updates amount, payment schedule amount_paid and status.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Payment confirmed successfully' })
  @ApiResponse({ status: 400, description: 'Payment is not in pending_review status' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmPaymentDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.paymentsService.confirm(id, dto, currentUser);
  }

  // ─── PATCH /payments/:id/reject ──────────────────────────────

  @Patch(':id/reject')
  @Roles('owner', 'employee')
  @ApiOperation({ summary: 'Reject a pending_review payment with a reason.' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Payment rejected successfully' })
  @ApiResponse({ status: 400, description: 'Payment is not in pending_review status' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectPaymentDto,
  ) {
    return this.paymentsService.reject(id, dto);
  }
}
