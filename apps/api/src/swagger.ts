import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from "@nestjs/swagger";
import type { INestApplication } from "@nestjs/common";

/** OpenAPI document definition, shared by the running server and the generator. */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle("dateChain API")
    .setDescription("REST API for the dateChain dating platform")
    .setVersion("0.1.0")
    .addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "JWT" }, "access-token")
    .build();
  return SwaggerModule.createDocument(app, config);
}

/** Mounts Swagger UI at /api/docs (JSON at /api/docs-json). */
export function setupSwagger(app: INestApplication): OpenAPIObject {
  const document = buildOpenApiDocument(app);
  SwaggerModule.setup("api/docs", app, document, {
    jsonDocumentUrl: "api/docs-json",
  });
  return document;
}
