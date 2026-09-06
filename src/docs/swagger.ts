import { Application } from 'express';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

export function setupSwagger(app: Application): void {
  const candidates = [
    path.join(__dirname, 'openapi.yaml'),
    path.join(process.cwd(), 'src/docs/openapi.yaml'),
    path.join(process.cwd(), 'dist/docs/openapi.yaml'),
    path.join(process.cwd(), 'openapi.yaml'),
  ];

  const openapiPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!openapiPath) {
    console.warn('[swagger] openapi.yaml not found');
    return;
  }

  const file = fs.readFileSync(openapiPath, 'utf8');
  const document = YAML.parse(file) as Record<string, unknown>;

  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(document, {
      customSiteTitle: 'CivicFix API Docs',
      swaggerOptions: {
        persistAuthorization: true,
      },
    }),
  );
}
