import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('OneSync API')
    .setDescription('The OneSync API description')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'Token',
        description: 'Access token from login',
      },
      'bearer',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'storeId',
        in: 'header',
        description: 'Store ID (required for non-consumer roles)',
      },
      'storeId',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'roleId',
        in: 'header',
        description: 'Role ID for store/role context selection',
      },
      'roleId',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  document.security = [{ bearer: [] }, { storeId: [] }, { roleId: [] }];

  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
