import { z } from 'zod'

export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'name is required').max(100),
})
export type CreateProjectDto = z.infer<typeof CreateProjectSchema>
