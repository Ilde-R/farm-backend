import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ReadingChartQueryDto } from './dto/reading-chart-query.dto';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { UpdateBlowerConfigDto } from './dto/update-aeration.dto';
import { CreateAerationDto } from './dto/create-aeration.dto';
import { AerationsService } from './services/aeration.service';

@ApiTags('Aeracion')
@ApiBearerAuth()
@Controller('aerations')
export class AerationsController {
  constructor(private readonly aerationService: AerationsService) {}

  @Get('readings/chart')
  @ApiOperation({
    summary: 'Obtener registros de presión para gráfica',
  })
  async getReadingsForChart(
    @Query() query: ReadingChartQueryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.aerationService.getReadingsForChart(
      req.user.tenantId,
      query,
    );
  }

  @Post('provision')
  @ApiOperation({
    summary: 'Provisionar un nuevo dispositivo IoT y generar una device key',
  })
  async provision(@Body() createAerationDto: CreateAerationDto, @Req() req: RequestWithUser) {
    return this.aerationService.provision(req.user.tenantId, createAerationDto);
  }

  @Get('devices')
  @ApiOperation({ summary: 'Listar todas las device keys de un tenant' })
  async listDevices(@Req() req: RequestWithUser) {
    return this.aerationService.listDeviceKeys(req.user.tenantId);
  }

  @Patch('devices/:key/revoke')
  @ApiOperation({ summary: 'Revocar una device key' })
  async revokeDevice(@Param('key') key: string, @Req() req: RequestWithUser) {
    return this.aerationService.revokeDeviceKey(key, req.user.tenantId);
  }

  @Patch('blowers/:blowerId/config')
  @ApiOperation({ summary: 'Configurar intervalo de guardado de un blower' })
  async updateBlowerConfig(
    @Param('blowerId') blowerId: string,
    @Body() dto: UpdateBlowerConfigDto,
    @Req() req: RequestWithUser,
  ) {
    return this.aerationService.updateBlowerConfig(req.user.tenantId, blowerId, dto);
  }

  @Delete('blowers/:blowerId')
  @ApiOperation({ summary: 'Eliminar un blower y keys' })
  async deleteBlower(
    @Param('blowerId') blowerId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.aerationService.deleteBlower(req.user.tenantId, blowerId);
  }
}