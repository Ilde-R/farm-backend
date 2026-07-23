import {
  Controller,
  Get,
  Param,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';

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
}
