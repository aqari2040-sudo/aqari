import {
  Controller,
  Get,
  Patch,
  Param,
  ParseUUIDPipe,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { QueryNotificationDto } from './dto/query-notification.dto';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/current-user.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ─── GET /notifications ───────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'List notifications for the current user (paginated)',
  })
  @ApiResponse({ status: 200, description: 'Paginated notifications list' })
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: QueryNotificationDto,
  ) {
    return this.notificationsService.findAll(user.id, query);
  }

  // ─── GET /notifications/unread-count ─────────────────────────

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count for current user' })
  @ApiResponse({
    status: 200,
    description: 'Unread notification count',
    schema: { example: { count: 5 } },
  })
  async getUnreadCount(@CurrentUser() user: AuthUser): Promise<{ count: number }> {
    const count = await this.notificationsService.getUnreadCount(user.id);
    return { count };
  }

  // ─── PATCH /notifications/read-all ───────────────────────────

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark all notifications as read for current user" })
  @ApiResponse({
    status: 200,
    description: 'Number of notifications marked as read',
    schema: { example: { count: 12 } },
  })
  async markAllAsRead(
    @CurrentUser() user: AuthUser,
  ): Promise<{ count: number }> {
    return this.notificationsService.markAllAsRead(user.id);
  }

  // ─── PATCH /notifications/:id/read ───────────────────────────

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a single notification as read' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 403, description: 'Not your notification' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.notificationsService.markAsRead(id, user.id);
  }
}
