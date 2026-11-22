import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ApiExceptionFilter } from './common/api-exception.filter';
import type { Request, Response, NextFunction } from 'express';
export function configureApp(app: INestApplication, origin: string) {
  app.setGlobalPrefix('api');
  app.enableCors({
    origin,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Gulf-Request'],
  });
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (/^\/api\/(auth|admin|branches)(\/|$)/.test(req.path))
      res.setHeader('Cache-Control', 'no-store');
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      (req.headers.origin !== origin ||
        req.headers['x-gulf-request'] !== 'admin' ||
        !req.is('application/json'))
    ) {
      res.status(403).json({
        statusCode: 403,
        message: 'Request origin or content type is not permitted',
      });
      return;
    }
    next();
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();
}
