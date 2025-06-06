import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ContractOperationError } from '../errors/ContractOperationError';
import { ProviderConnectionError } from '../errors/ProviderConnectionError';
import { PersistenceError } from '../errors/PersistenceError';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse() as string;
    } else if (exception instanceof ContractOperationError) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
    } else if (exception instanceof ProviderConnectionError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = exception.message;
    } else if (exception instanceof PersistenceError) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = exception.message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
