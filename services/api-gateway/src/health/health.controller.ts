import { Controller, Get } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}
  @Get()
  async ok() {
    // quick DB ping
    await this.prisma.$queryRaw`SELECT 1`
    return { ok: true }
  }
}
