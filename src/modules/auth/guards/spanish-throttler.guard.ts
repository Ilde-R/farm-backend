import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class SpanishThrottlerGuard extends ThrottlerGuard {
  protected getErrorMessage(): Promise<string> {
    return Promise.resolve(
      'Has excedido el límite de solicitudes. Inténtalo de nuevo más tarde.',
    );
  }
}
