import { Module } from '@nestjs/common'
import { PrismaService } from './prisma/prisma.service'
import { ProjectsController } from './projects/projects.controller'
import { ProjectsService } from './projects/projects.service'
import { PipelinesController } from './pipelines/pipelines.controller'
import { PipelinesService } from './pipelines/pipelines.service'
import { HealthController } from './health/health.controller'
import { ScanController } from './scan/scan.controller'
import { ScanService } from './scan/scan.service'

@Module({
  controllers: [ProjectsController, PipelinesController, HealthController, ScanController],
  providers: [PrismaService, ProjectsService, PipelinesService, ScanService],
})
export class AppModule {}
