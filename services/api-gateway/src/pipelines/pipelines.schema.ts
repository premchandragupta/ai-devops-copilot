import { z } from 'zod'

export const CreatePipelineSchema = z.object({
  name: z.string().min(1, 'name is required').max(100),
  projectId: z.string().min(1, 'projectId is required'),
  repoUrl: z.string().url().optional(),
})
export type CreatePipelineDto = z.infer<typeof CreatePipelineSchema>
