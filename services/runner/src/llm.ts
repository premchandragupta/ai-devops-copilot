export interface LlmInput {
  file: string
  diff: string
}

export interface LlmSuggestion {
  file: string
  summary: string
  tests: string[]
  comments: Array<{ line: number, body: string }>
}

// Use valid JS/TS regex flags (no (?i)); apply /i where needed.
const SECRET_PATTERNS: RegExp[] = [
  /(api[_-]?key|token|secret|password)\s*[:=]\s*['"]?[A-Za-z0-9_\-]{8,}['"]?/gi,
  /AKIA[0-9A-Z]{16}/g, // AWS Access Key ID
  /-----BEGIN (?:RSA|EC|DSA|OPENSSH) PRIVATE KEY-----[\s\S]*?-----END (?:RSA|EC|DSA|OPENSSH) PRIVATE KEY-----/g,
  /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, // JWT-like
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}/g // emails
]

export function sanitize(text: string): string {
  let out = text
  for (const re of SECRET_PATTERNS) out = out.replace(re, '[REDACTED]')
  // collapse long lines
  return out
    .split(/\r?\n/)
    .map(l => (l.length > 500 ? l.slice(0, 500) + ' …[truncated]' : l))
    .join('\n')
}

// Mock LLM that inspects diff text and returns generic suggestions
export async function generateSuggestions(inputs: LlmInput[]): Promise<LlmSuggestion[]> {
  const suggestions: LlmSuggestion[] = []
  for (const item of inputs) {
    const safe = sanitize(item.diff)
    const tests: string[] = []

    if (/discount/i.test(safe)) {
      tests.push('Add boundary tests for discount: -1, 0, 100, 101')
    }
    if (/password/i.test(safe)) {
      tests.push('Ensure password is never logged and is hashed with bcrypt or argon2')
    }
    if (/fetch\(|axios|http/i.test(safe)) {
      tests.push('Add retries and timeouts to outbound HTTP calls; validate response schema')
    }

    const comments: Array<{ line: number; body: string }> = []
    const lines = safe.split(/\r?\n/)
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      if (lines[i].startsWith('+') && lines[i].length > 100) {
        comments.push({ line: i + 1, body: 'Consider splitting long line for readability' })
      }
    }

    suggestions.push({
      file: item.file,
      summary: tests.length
        ? 'Generated test ideas based on diff patterns'
        : 'No specific issues detected in mock analysis',
      tests,
      comments,
    })
  }
  return suggestions
}
