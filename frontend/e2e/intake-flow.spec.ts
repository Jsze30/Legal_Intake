import { expect, test } from '@playwright/test';

test('imports, selects, analyzes, reviews evidence, and records a decision', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Upload transcripts.' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('upload.png'), fullPage: true, animations: 'disabled' });

  await page.getByRole('button', { name: 'Preview with sample data' }).click();
  await expect(page.getByRole('heading', { name: 'Choose a transcript.' })).toBeVisible();
  await expect(page.getByText('14 transcripts found.')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('selection.png'), fullPage: true, animations: 'disabled' });

  await page.getByTestId('transcript-13').click();
  await page.getByRole('button', { name: 'Analyze transcript' }).click();
  await expect(page.getByRole('heading', { name: 'Analyzing transcript.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tamika Johnson' })).toBeVisible({ timeout: 6000 });
  await expect(page.getByRole('heading', { name: 'Sign this case.' })).toBeVisible();
  await expect(page.locator('.review-grid')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: testInfo.outputPath('review.png'), fullPage: true, animations: 'disabled' });

  const damages = page.getByRole('article').filter({ hasText: 'Damages' });
  await damages.getByRole('button', { name: 'See source ↗' }).click();
  await expect(page.getByRole('dialog', { name: 'Call transcript' })).toBeVisible();
  await page.locator('.drawer .close').click();

  await page.getByRole('button', { name: 'Hold for review' }).click();
  await expect(page.getByText('Case held for attorney review.')).toBeVisible();
});
