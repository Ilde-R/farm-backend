import { Controller, Post, Body, Get, Patch, Param, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { IotService } from './iot.service';
import { ProvisionDto } from './dto/provision.dto';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';

@ApiTags('iot')
@ApiBearerAuth()
@Controller('iot')
export class IotController {
  constructor(private readonly iotService: IotService) {}

  @Post('provision')
  @ApiOperation({
    summary: 'Provisionar un nuevo dispositivo IoT y generar una device key',
  })
  async provision(@Body() dto: ProvisionDto, @Req() req: RequestWithUser) {
    return this.iotService.provision(req.user.tenantId, dto);
  }

  @Get('devices')
  @ApiOperation({ summary: 'Listar todas las device keys de un tenant' })
  async listDevices(@Req() req: RequestWithUser) {
    return this.iotService.listDeviceKeys(req.user.tenantId);
  }

  @Patch('devices/:key/revoke')
  @ApiOperation({ summary: 'Revocar una device key' })
  async revokeDevice(@Param('key') key: string) {
    return this.iotService.revokeDeviceKey(key);
  }
}
