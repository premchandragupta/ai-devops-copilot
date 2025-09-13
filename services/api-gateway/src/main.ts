import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { env } from './config/env'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors()
  await app.listen(env.PORT)
  // eslint-disable-next-line no-console
  console.log(`[api-gateway] listening on http://localhost:${env.PORT}`)
}
bootstrap()
