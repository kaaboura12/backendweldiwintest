import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
  
  // Enable CORS for production
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : true,
    credentials: true,
  });

  // Serve uploaded audio files (only in non-serverless environments)
  // On serverless (Vercel), files are stored as base64 data URLs
  if (process.env.VERCEL !== '1') {
    const httpApp = app.getHttpAdapter().getInstance();
    httpApp.use('/uploads/audio', express.static(join(process.cwd(), 'uploads', 'audio')));
  }

  // Swagger Configuration (only in development)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('WeldiWin User Management API')
      .setDescription('Complete user management system with authentication, roles, and parent-child relationships')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  const port = process.env.PORT || 3005;
  await app.listen(port);
  console.log(`Application is running on port: ${port}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Swagger documentation available at: http://localhost:${port}/api`);
  }
}
bootstrap();