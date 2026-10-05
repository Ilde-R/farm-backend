import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBasicAuth, ApiTags } from '@nestjs/swagger';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { CreateStockOutflowDto } from './dto/create-stock-outflow.dto';
import { TankMovementsQueryDto } from './dto/tank-movements-query.dto';
import { TankMovementsService } from './tank-movements.service';

@ApiTags('Movimientos de tanques')
@ApiBasicAuth()
@Controller()
export class TankMovementsController {
  constructor(private readonly tankMovementsService: TankMovementsService) {}

  @Post('tank-movements/transfers')
  createTransfer(
    @Req() req: RequestWithUser,
    @Body() createTransferDto: CreateTransferDto,
  ) {
    return this.tankMovementsService.createTransfer(
      createTransferDto,
      req.user.tenantId,
    );
  }

  @Post('tank-movements/outflows')
  createStockOutflow(
    @Req() req: RequestWithUser,
    @Body() createStockOutflowDto: CreateStockOutflowDto,
  ) {
    return this.tankMovementsService.createStockOutflow(
      createStockOutflowDto,
      req.user.tenantId,
    );
  }

  @Get('tanks/:tankId/movements')
  findForTank(
    @Req() req: RequestWithUser,
    @Param('tankId', ParseUUIDPipe) tankId: string,
    @Query() query: TankMovementsQueryDto,
  ) {
    return this.tankMovementsService.findForTank(
      tankId,
      query,
      req.user.tenantId,
    );
  }
}
