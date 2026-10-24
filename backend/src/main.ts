import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { AppModule } from './app.module';
import { setupApp } from './setup-app';

/**
 * Serves the built React app (frontend/dist) when it exists, so one server
 * can host both the site and the API. Unknown non-API paths get index.html
 * for client-side routing.
 */
function serveFrontend(app: NestExpressApplication) {
  const dir = resolve(
    process.env.FRONTEND_DIR ?? join(__dirname, '..', '..', 'frontend', 'dist'),
  );
  const index = join(dir, 'index.html');
  if (!existsSync(index)) return;

  app.useStaticAssets(dir);
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    res.sendFile(index);
  });
  Logger.log(`Serving frontend from ${dir}`, 'Bootstrap');
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  setupApp(app);
  serveFrontend(app);
  app.enableShutdownHooks();
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  Logger.log(
    `API on http://localhost:${port}/api  (docs: /api/docs)`,
    'Bootstrap',
  );
}
void bootstrap();
