import { Body, Controller, Get, Post, UsePipes } from '@nestjs/common'
import { ProjectsService } from './projects.service'
import { CreateProjectSchema, type CreateProjectDto } from './projects.schema'
import { ZodValidationPipe } from '../common/zod.pipe'

@Controller('projects')
export class ProjectsController {
  constructor(private projects: ProjectsService) {}

  @Get()
  async list() {
    return this.projects.list()
  }

  @Post()
  @UsePipes(new ZodValidationPipe(CreateProjectSchema))
  async create(@Body() body: CreateProjectDto) {
    return this.projects.create(body.name)
  }
}
