import { describe, it, expect } from 'vitest'
import { mapSeverity } from '../src/utils.js'
import { runSemgrep } from '../src/semgrep.js'

describe('severity mapping', () => {
  it('maps severities', () => {
    expect(mapSeverity('critical')).toBe('HIGH')
    expect(mapSeverity('HIGH')).toBe('HIGH')
    expect(mapSeverity('warning')).toBe('MEDIUM')
    expect(mapSeverity('info')).toBe('LOW')
  })
})

// We do not run real semgrep in unit tests; just ensure function exists
describe('semgrep runner shape', () => {
  it('exports a function', () => {
    expect(typeof runSemgrep).toBe('function')
  })
})
