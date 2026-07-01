import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

/**
 * Formats Nest HttpExceptions to match oneSyncNew (Express) response bodies and status handling.
 */
@Catch(HttpException)
export class ExpressResponseFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === 'string') {
      if (status === HttpStatus.UNAUTHORIZED) {
        return response.status(status).send(exceptionResponse);
      }

      if (status === HttpStatus.BAD_REQUEST) {
        return response.status(status).json({
          success: false,
          message: exceptionResponse,
        });
      }

      if (status === HttpStatus.FORBIDDEN) {
        return response.status(status).json({
          success: false,
          message: exceptionResponse,
        });
      }

      return response.status(status).json({ message: exceptionResponse });
    }

    if (typeof exceptionResponse !== 'object' || exceptionResponse === null) {
      return response.status(status).json({
        success: false,
        message: 'Internal Server Error',
      });
    }

    const body = exceptionResponse as Record<string, unknown>;

    // Nest wraps object payloads: { statusCode, message: { ... }, error }
    if (
      typeof body.message === 'object' &&
      body.message !== null &&
      !Array.isArray(body.message)
    ) {
      return response.status(status).json(body.message);
    }

    // class-validator / ValidationPipe default array messages
    if (Array.isArray(body.message)) {
      return response.status(status).json({
        message: body.message[0] || 'Invalid input',
        status: 0,
      });
    }

    // Nest default string wrapper: { statusCode, message: string, error }
    if (
      typeof body.message === 'string' &&
      'statusCode' in body &&
      'error' in body &&
      !('success' in body) &&
      !('status' in body)
    ) {
      if (status === HttpStatus.FORBIDDEN && body.message === 'Forbidden: No permission') {
        return response.status(status).json({ message: body.message });
      }

      if (status === HttpStatus.BAD_REQUEST) {
        return response.status(status).json({
          success: false,
          message: body.message,
        });
      }

      if (status === HttpStatus.FORBIDDEN) {
        return response.status(status).json({
          success: false,
          message: body.message,
        });
      }

      if (status === HttpStatus.UNAUTHORIZED) {
        return response.status(status).send(body.message);
      }

      return response.status(status).json({ message: body.message });
    }

    return response.status(status).json(body);
  }
}
