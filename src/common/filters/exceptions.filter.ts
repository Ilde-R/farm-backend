import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class ExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const isProduction = process.env.NODE_ENV === 'production';

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    const message =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as any).message || (exceptionResponse as any).error || exceptionResponse
        : exceptionResponse;

    if (httpStatus >= 500) {
      this.logger.error(
        `Error: ${exception instanceof Error ? exception.message : 'Unknown'}\nStack: ${exception instanceof Error ? exception.stack : ''}`,
      );
    } else {
      this.logger.warn(
        `[${httpStatus}] ${Array.isArray(message) ? message.join(', ') : (message as any)?.message || message}`,
      );
    }

    const responseBody = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
      message: isProduction && httpStatus >= 500
        ? 'Internal server error'
        : message,
      ...(isProduction
        ? {}
        : {
            errorName: exception instanceof Error ? exception.name : 'UnknownError',
            stack: exception instanceof Error ? exception.stack : undefined,
          }),
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
