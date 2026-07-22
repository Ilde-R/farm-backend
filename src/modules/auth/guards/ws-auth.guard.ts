import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>();
    const token =
      (client.handshake.query?.token as string) ||
      (client.handshake.auth?.token as string);

    if (!token) {
      throw new WsException('Token no proporcionado');
    }

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
        tenantId: string;
      }>(token);

      (client as any).user = payload;
      return true;
    } catch {
      throw new WsException('Token inválido o expirado');
    }
  }
}
