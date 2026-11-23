import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { ExpressAdapter } from '@nestjs/platform-express';
import { ApiExceptionFilter } from './common/api-exception.filter';
import type { Request, Response, NextFunction } from 'express';
export function configureApp(app: INestApplication, origin: string) {
  app.setGlobalPrefix('api');
  (app.getHttpAdapter() as ExpressAdapter).useBodyParser('json', true, {
    limit: '1100kb',
  });
  app.enableCors({
    origin,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Gulf-Request', 'Range'],
    exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'],
  });
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    if (/^\/api\/(auth|admin|branches)(\/|$)/.test(req.path))
      res.setHeader('Cache-Control', 'no-store');
    if (req.path === '/api/messaging/webhook' && req.method === 'POST') {
      next();
      return;
    }
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      (req.headers.origin !== origin ||
        req.headers['x-gulf-request'] !==
          (/^\/api\/engagement(?:\/|$)/.test(req.path) ||
          /^\/api\/health-academy\/videos\/[a-z0-9-]+\/events$/.test(req.path)
            ? 'public'
            : 'admin') ||
        !(
          req.is('application/json') ||
          (req.method === 'PUT' &&
            /^\/api\/admin\/videos\/[a-f0-9-]{36}\/upload$/.test(req.path) &&
            (req.is('video/mp4') || req.is('video/quicktime')))
        ))
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
