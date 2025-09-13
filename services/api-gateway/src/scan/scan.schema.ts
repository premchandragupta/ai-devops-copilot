import { z } from 'zod'

export const ScanRequestSchema = z.object({
  path: z.string().min(1, 'path is required'),
  config: z.string().optional(),
  timeoutSeconds: z.number().int().min(5).max(600).optional(),
})

export type ScanRequestDto = z.infer<typeof ScanRequestSchema>
