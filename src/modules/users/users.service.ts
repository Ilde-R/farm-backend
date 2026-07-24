import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRepository } from './repositories/user.repository';
import { BaseService } from '../../common/abstracts/base.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService extends BaseService<
  any,
  CreateUserDto,
  UpdateUserDto
> {
  constructor(protected readonly userRepository: UserRepository) {
    super(userRepository);
  }

  async findByTenant(tenantId: string) {
    return this.userRepository.findByTenant(tenantId);
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    if (updateProfileDto.email) {
      const existing = await this.userRepository.findByEmail(
        updateProfileDto.email,
      );
      if (existing && existing.id !== userId) {
        throw new ConflictException('El email ya esta en uso');
      }
    }

    return this.userRepository.updateProfile(userId, updateProfileDto);
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const credential = await this.userRepository.findCredentialByUserId(userId);
    if (!credential) {
      throw new NotFoundException('Credenciales no encontradas');
    }

    const isValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );

    if (!isValid) {
      throw new UnauthorizedException('El password es incorrecto');
    }

    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(changePasswordDto.newPassword, salt);
    await this.userRepository.updateCredentialPassword(userId, hash);

    return { message: 'Password actualizado correctamente' };
  }

  async deleteAccount(userId: string) {
    const result = await this.userRepository.deleteUserWithTenant(userId);
    if (!result) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return {
      message: 'Cuenta eliminada correctamente',
      deletedUserId: result.deletedUserId,
      deletedTenantId: result.deletedTenantId,
    };
  }
}
