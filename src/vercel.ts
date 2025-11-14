import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import express, { Express } from 'express';

let cachedServer: Express | undefined;

async function bootstrapServer(): Promise<Express> {
	const server = express();
	const adapter = new ExpressAdapter(server);
	const app = await NestFactory.create(AppModule, adapter);
	
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
	
	app.enableCors({
		origin: process.env.FRONTEND_URL || true,
		credentials: true,
	});
	
	await app.init();
	return server;
}

export default async function handler(req: any, res: any) {
	if (!cachedServer) {
		cachedServer = await bootstrapServer();
	}
	return (cachedServer as any)(req, res);
}


