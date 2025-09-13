import { test, expect } from '@playwright/test'

test('loads dashboard heading', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { name: 'Release Health' })).toBeVisible()
})
