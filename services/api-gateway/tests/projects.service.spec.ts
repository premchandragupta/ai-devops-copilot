import { describe, it, expect, vi } from 'vitest'
import { ProjectsService } from '../src/projects/projects.service'

const prismaMock: any = {
  project: {
    findMany: vi.fn().mockResolvedValue([{ id: '1', name: 'Demo', createdAt: new Date(), updatedAt: new Date() }]),
    create: vi.fn().mockResolvedValue({ id: '1', name: 'Demo' }),
    findUnique: vi.fn().mockResolvedValue({ id: '1', name: 'Demo' }),
  },
}

describe('ProjectsService', () => {
  it('lists projects', async () => {
    const svc = new ProjectsService(prismaMock)
    const list = await svc.list()
    expect(list.length).toBe(1)
  })

  it('creates project', async () => {
    const svc = new ProjectsService(prismaMock)
    const p = await svc.create('X')
    expect(p.name).toBeDefined()
  })
})
