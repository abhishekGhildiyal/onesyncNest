import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Main');
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('v1');

  const config = new DocumentBuilder()
    .setTitle('OneSync API')
    .setDescription('The OneSync API description')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  //   app.use(helmet());
  app.enableCors({
    origin: '*', // or '*' for dev
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

  await app.listen(process.env.PORT ?? 3000).then(() => {
    logger.log(`🛜 Application is running on: ${process.env.PORT} 🛜`);
  });
}
bootstrap();
