import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class PipelinesService {
  constructor(private prisma: PrismaService) {}

  async list() {
    return this.prisma.pipeline.findMany({ orderBy: { createdAt: 'desc' } })
  }

  async create(input: { name: string; projectId: string; repoUrl?: string }) {
    // will throw if projectId invalid due to FK; optionally check first
    return this.prisma.pipeline.create({ data: input })
  }
}
