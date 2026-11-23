import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    if (error instanceof HttpException) {
      host.switchToHttp().getRequest().resume();
      response.status(error.getStatus()).json(error.getResponse());
      return;
    }
    this.logger.error('Request failed due to an internal service error');
    response
      .status(503)
      .json({ statusCode: 503, message: 'Service temporarily unavailable' });
  }
}
