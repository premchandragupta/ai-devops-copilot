import * as fs from 'node:fs'
import * as path from 'node:path'
import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common'
import { execPolicyEngine } from './scan.process'

@Injectable()
export class ScanService {
  async runScan(input: { path: string, config?: string, timeoutSeconds?: number }) {
    const absPath = path.isAbsolute(input.path) ? input.path : path.resolve(process.cwd(), input.path)
    if (!fs.existsSync(absPath) || !fs.statSync(absPath).isDirectory()) {
      throw new BadRequestException(`scan path not found or not a directory: ${absPath}`)
    }

    const args = ['--path', absPath]
    if (input.config) {
      const cfg = path.isAbsolute(input.config) ? input.config : path.resolve(process.cwd(), input.config)
      if (!fs.existsSync(cfg)) {
        throw new BadRequestException(`config file not found: ${cfg}`)
      }
      args.push('--config', cfg)
    }

    // policy: allow up to 120s by default
    const timeoutMs = (input.timeoutSeconds ?? 120) * 1000
    const { code, stdout, stderr } = await execPolicyEngine(args, { timeoutMs })

    // Semgrep returns 1 when findings found; our CLI also returns 1 for HIGH findings.
    // For code 0 or 1, we still expect JSON in stdout.
    if (code === 0 || code === 1) {
      try {
        const parsed = JSON.parse(stdout)
        return { code, result: parsed, stderr }
      } catch {
        throw new InternalServerErrorException('scan completed but failed to parse JSON output')
      }
    }

    // Any other exit code => treat as tool error, include stderr for operator
    throw new InternalServerErrorException(`scan failed (exit ${code}): ${stderr}`)
  }
}
