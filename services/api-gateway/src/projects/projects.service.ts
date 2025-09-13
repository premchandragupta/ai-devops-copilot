import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async list() {
    return this.prisma.project.findMany({ orderBy: { createdAt: 'desc' } })
  }

  async create(name: string) {
    return this.prisma.project.create({ data: { name } })
  }

  async ensureExists(id: string) {
    const p = await this.prisma.project.findUnique({ where: { id } })
    if (!p) throw new NotFoundException(`Project ${id} not found`)
    return p
  }
}
