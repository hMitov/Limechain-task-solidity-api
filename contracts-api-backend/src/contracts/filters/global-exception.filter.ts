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
import { MissingConfigurationError } from '../errors/MissingConfigurationError';
import { AuctionListenerError } from '../errors/AuctionListenerError';
import { RetryFailedError } from '../errors/RetryFailedError';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorType = 'UnknownError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse() as string;
      errorType = exception.name;
    } else if (exception instanceof ContractOperationError) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
      errorType = exception.name;
    } else if (exception instanceof ProviderConnectionError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = exception.message;
      errorType = exception.name;
    } else if (exception instanceof PersistenceError) {
      message = exception.message;
      errorType = exception.name;
    } else if (exception instanceof MissingConfigurationError) {
      message = exception.message;
      errorType = exception.name;
    } else if(exception instanceof RetryFailedError) {
      message = exception.message;
      errorType = exception.name;
    } else if (exception instanceof AuctionListenerError) {
      message = exception.message;
      errorType = exception.name;
    } else if (exception instanceof Error) {
      message = exception.message;
      errorType = exception.name;
    }

    response.status(status).json({
      statusCode: status,
      message,
      errorType,
      timestamp: new Date().toISOString(),
    });
  }
}
