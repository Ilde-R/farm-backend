import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiTags('Usuarios')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar usuarios del tenant actual' })
  async findAll(@Req() req: RequestWithUser) {
    return this.usersService.findByTenant(req.user.tenantId);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Obtener perfil del usuario actual' })
  async getProfile(@Req() req: RequestWithUser) {
    return this.usersService.getProfile(req.user.sub);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Actualizar perfil' })
  async updateProfile(
    @Req() req: RequestWithUser,
    @Body() updateProflileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(req.user.sub, updateProflileDto);
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
