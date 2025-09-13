import { Body, Controller, Post, UsePipes } from '@nestjs/common'
import { ScanService } from './scan.service'
import { ZodValidationPipe } from '../common/zod.pipe'
import { ScanRequestSchema, type ScanRequestDto } from './scan.schema'

@Controller('scan')
export class ScanController {
  constructor(private readonly scan: ScanService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(ScanRequestSchema))
  async create(@Body() body: ScanRequestDto) {
    const res = await this.scan.runScan(body)
    return res
  }
}
