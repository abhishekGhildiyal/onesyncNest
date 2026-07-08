import { Logger, ValidationPipe, BadRequestException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import { AppModule } from './app.module';
import { setupSwagger } from './common/config/swagger.config';
import { ExpressResponseFilter } from './common/filters/express-response.filter';
import { UnhandledExceptionFilter } from './common/filters/unhandled-exception.filter';

async function bootstrap() {
  const logger = new Logger('Main');
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  app.use(
    '/v1/webhook',
    express.raw({ type: 'application/json' }),
    (req: express.Request & { rawBody?: Buffer }, _res, next) => {
      req.rawBody = req.body as Buffer;
      if (Buffer.isBuffer(req.body)) {
        try {
          req.body = JSON.parse(req.body.toString('utf8'));
        } catch {
          req.body = {};
        }
      }
      next();
    },
  );
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) => {
        const firstError = errors[0];
        const constraints = firstError?.constraints;
        const message =
          constraints && Object.keys(constraints).length > 0
            ? Object.values(constraints)[0]
            : 'Invalid input';

        return new BadRequestException({ message, status: 0 });
      },
    }),
  );

  app.useGlobalFilters(new UnhandledExceptionFilter(), new ExpressResponseFilter());
  app.setGlobalPrefix('v1');

  setupSwagger(app);

  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'roleId',
      'storeId',
      'userId',
    ],
    exposedHeaders: ['Authorization'],
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3115).then(() => {
    logger.log(`🛜 Application is running on: ${process.env.PORT ?? 3115} 🛜`);
  });
}
bootstrap();
