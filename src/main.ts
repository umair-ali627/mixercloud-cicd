import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { json, NextFunction, Request, Response, urlencoded } from 'express';
import { NestExpressApplication } from '@nestjs/platform-express';

function checkRequiredEnv() {
  const required = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
    'LIVEKIT_API_KEY',
    'LIVEKIT_API_SECRET',
    'LIVEKIT_URL',
  ];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    console.error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
    process.exit(1);
  }
}

async function bootstrap() {
  checkRequiredEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
    rawBody: true,
  });

  app.enableCors();

  // Skip body parsing for webhook routes to preserve raw body
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/webhook')) {
      let data = '';
      req.setEncoding('utf8');
      req.on('data', (chunk) => {
        data += chunk;
      });
      req.on('end', () => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        req.rawBody = Buffer.from(data, 'utf8');
        next();
      });
    } else {
      next();
    }
  });

  // Configure body parsing for non-webhook routes
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // Enable validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('MixerCloud Circles API')
      .setDescription('API documentation for MixerCloud Circles')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  await app.listen(process.env.PORT || 3000);
  console.log(
    `App listening on port => ${process.env.PORT || 3000} for NODE_ENV ${process.env.NODE_ENV || 'local'}`,
  );
}
bootstrap();
