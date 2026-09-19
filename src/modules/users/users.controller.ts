import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@ApiTags('Usuarios')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar usuarios del tenant actual (paginado)' })
  async findAll(
    @Req() req: RequestWithUser,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.usersService.findAll(pagination, req.user.tenantId);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Ver perfil' })
  async getProfile(@Req() req: RequestWithUser) {
    return this.usersService.getProfile(req.user.sub, req.user.tenantId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Actualizar perfil' })
  async updateProfile(
    @Req() req: RequestWithUser,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(req.user.sub, updateProfileDto);
  }

  @Patch('password')
  @ApiOperation({ summary: 'Cambiar password' })
  async changePassword(
    @Req() req: RequestWithUser,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(req.user.sub, changePasswordDto);
  }

  @Delete('profile')
  @ApiOperation({ summary: 'Eliminar cuenta propia' })
  async deleteAccount(@Req() req: RequestWithUser) {
    return this.usersService.deleteAccount(req.user.sub);
  }
}
