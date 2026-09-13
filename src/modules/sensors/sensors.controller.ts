import {
  Controller,
  Get,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SensorsService } from './sensors.service';
import { ReadingChartQueryDto } from './dto/reading-chart-query.dto';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';

@ApiTags('Sensores')
@ApiBearerAuth()
@Controller('sensors')
export class SensorsController {
  constructor(private readonly sensorsService: SensorsService) {}

  @Get('readings/chart')
  @ApiOperation({
    summary: 'Obtener registros de presión para gráfica',
  })
  async getReadingsForChart(
    @Query() query: ReadingChartQueryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.sensorsService.getReadingsForChart(
      req.user.tenantId,
      query,
    );
  }
}