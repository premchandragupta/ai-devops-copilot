import { Body, Controller, Get, Post, UsePipes } from '@nestjs/common'
import { PipelinesService } from './pipelines.service'
import { CreatePipelineSchema, type CreatePipelineDto } from './pipelines.schema'
import { ZodValidationPipe } from '../common/zod.pipe'

@Controller('pipelines')
export class PipelinesController {
  constructor(private pipelines: PipelinesService) {}

  @Get()
  async list() {
    return this.pipelines.list()
  }

  @Post()
  @UsePipes(new ZodValidationPipe(CreatePipelineSchema))
  async create(@Body() body: CreatePipelineDto) {
    return this.pipelines.create(body)
  }
}
