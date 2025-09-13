export async function withBackoff<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; baseMs?: number; maxMs?: number } = {}
): Promise<T> {
  const retries = opts.retries ?? 5
  const base = opts.baseMs ?? 200
  const max = opts.maxMs ?? 5000

  let attempt = 0
  let lastErr: any = null
  while (attempt <= retries) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e
      if (attempt === retries) break
      const delay = Math.min(max, base * Math.pow(2, attempt)) + Math.floor(Math.random() * 200)
      await new Promise(r => setTimeout(r, delay))
      attempt++
    }
  }
  throw lastErr
}
