import { describe, it, expect, vi } from 'vitest'
import { PipelinesService } from '../src/pipelines/pipelines.service'

const prismaMock: any = {
  pipeline: {
    findMany: vi.fn().mockResolvedValue([{ id: '1', name: 'CI', projectId: 'p1', createdAt: new Date() }]),
    create: vi.fn().mockResolvedValue({ id: '2', name: 'New', projectId: 'p1' }),
  },
}

describe('PipelinesService', () => {
  it('lists pipelines', async () => {
    const svc = new PipelinesService(prismaMock)
    const list = await svc.list()
    expect(list[0].name).toBe('CI')
  })

  it('creates pipeline', async () => {
    const svc = new PipelinesService(prismaMock)
    const p = await svc.create({ name: 'X', projectId: 'p1' })
    expect(p.id).toBeDefined()
  })
})
