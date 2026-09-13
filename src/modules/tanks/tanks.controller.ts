import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  Query, 
  Req, 
} from '@nestjs/common';
import { TanksService } from './tanks.service';
import { CreateTankDto } from './dto/create-tank.dto';
import { UpdateTankDto } from './dto/update-tank.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';


@Controller('tanks')
export class TanksController {
  constructor(private readonly tanksService: TanksService) {}

  @Post()
  create(
    @Req() req:RequestWithUser,
    @Body() createTankDto: CreateTankDto,
  ) {
    return this.tanksService.create(createTankDto, req.user.tenantId);
  }

  @Get()
  findAll(
    @Req() req:RequestWithUser,
    @Query() paginationDto: PaginationQueryDto,
  ) {
    return this.tanksService.findAll(paginationDto, req.user.tenantId);
  }

  @Get(':id')
  findOne(
    @Req() req:RequestWithUser,
    @Param('id') id: string,
  ) {
    return this.tanksService.findOne(id, req.user.tenantId);
  }

  @Patch(':id')
  update(
    @Req() req:RequestWithUser,
    @Param('id') id: string,
    @Body() updateTankDto: UpdateTankDto,
  ) {
    return this.tanksService.update(id, updateTankDto, req.user.tenantId);
  }

  @Delete(':id')
  remove(
    @Req() req:RequestWithUser,
    @Param('id') id: string,
  ) {
    return this.tanksService.remove(id, req.user.tenantId);
  }
}