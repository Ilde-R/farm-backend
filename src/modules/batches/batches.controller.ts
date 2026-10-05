import { Controller, Get, Post, Body, Patch, Param, Delete, Req, Query } from '@nestjs/common';
import { BatchesService } from './batches.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ApiBasicAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Lotes')
@ApiBasicAuth()
@Controller('batches')
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Post()
  create(
    @Req() req: RequestWithUser,
    @Body() createBatchDto: CreateBatchDto) {
    return this.batchesService.create(createBatchDto, req.user.tenantId);
  }

  @Get()
  findAll(
    @Req() req: RequestWithUser,
    @Query() paginationDto: PaginationQueryDto) {
    return this.batchesService.findAll(paginationDto, req.user.tenantId);
  }

  @Get(':id')
  findOne(
    @Req() req: RequestWithUser,
    @Param('id') id: string) {
    return this.batchesService.findOne(id, req.user.tenantId);
  }

  @Patch(':id')
  update(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() updateBatchDto: UpdateBatchDto) {
    return this.batchesService.update(id, updateBatchDto, req.user.tenantId);
  }

  @Delete(':id')
  remove(
    @Req() req: RequestWithUser,
    @Param('id') id: string) {
    return this.batchesService.remove(id, req.user.tenantId);
  }
}
