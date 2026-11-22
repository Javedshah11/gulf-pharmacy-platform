import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';
import { validateEnvironment } from './config/environment';
async function bootstrap() {
  const env = validateEnvironment();
  const app = await NestFactory.create(AppModule);
  configureApp(app, env.CORS_ORIGIN);
  await app.listen(env.PORT, env.HOST);
}
bootstrap().catch(() => {
  console.error(
    'API startup failed. Verify environment configuration and service availability.',
  );
  process.exitCode = 1;
});
