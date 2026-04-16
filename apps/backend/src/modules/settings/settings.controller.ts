import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Roles('owner')
  async findAll() {
    return this.settingsService.findAll();
  }

  @Patch(':key')
  @Roles('owner')
  async update(
    @Param('key') key: string,
    @Body() body: { value: any },
    @CurrentUser() user: AuthUser,
  ) {
    return this.settingsService.update(key, body.value, user.id);
  }
}
