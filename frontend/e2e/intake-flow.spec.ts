import { expect, test } from '@playwright/test';

const demoMode = process.env.PLAYWRIGHT_DEMO_MODE === 'true';

test('imports, selects, analyzes, reviews evidence, and records a decision', async ({ page }, testInfo) => {
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url());
  });
  const intakeId = '2fdd8754-5a63-4e96-b8f8-f54e24f90ae7';
  await page.route('**/api/intakes', async (route) => {
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ id: intakeId, status: 'received', failureReason: null }),
    });
  });
  await page.route(`**/api/intakes/${intakeId}/status`, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ id: intakeId, status: 'completed', failureReason: null }),
    });
  });
  await page.route(`**/api/intakes/${intakeId}/results`, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        intake: { id: intakeId, status: 'completed', failureReason: null },
        client: { firstName: 'Tamika', lastName: 'Johnson' },
        incident: {
          incidentType: 'Rideshare collision',
          occurredAt: '2024-10-12T00:00:00.000Z',
          occurredAtText: null,
          location: 'Decatur, Georgia',
          description: 'The Lyft was T-boned on the passenger side.',
        },
        defendants: [{ allegedFault: 'The driver rolled through a stop sign.' }],
        insurancePolicies: [{
          insuranceType: 'auto',
          carrierName: 'Lyft',
          policyNumber: null,
          coverageStatus: 'reported',
          policyLimit: 1_000_000,
        }],
        treatments: [{
          treatmentType: 'Wrist surgery',
          diagnosis: 'Fractured left wrist',
          notes: 'Plate and screws',
          billedAmount: 52_000,
          provider: { name: 'Emory', providerType: 'hospital' },
        }],
        servicesRendered: [],
        policeReport: {
          agencyName: 'DeKalb County',
          reportNumber: '24-DK-73891',
          reportStatus: 'mentioned',
          notes: null,
        },
        witnesses: [],
      }),
    });
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Upload transcripts.' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('upload.png'), fullPage: true, animations: 'disabled' });

  const sampleResponse = page.waitForResponse('**/sample-transcripts.jsonl');
  await page.getByRole('button', { name: 'Preview with sample data' }).click();
  const sampleText = await (await sampleResponse).text();
  expect(sampleText).toContain(demoMode ? 'Alyssa Renee Thompson' : 'Tamika Renee Johnson');
  expect(sampleText).not.toContain(demoMode ? 'Tamika Renee Johnson' : 'Alyssa Renee Thompson');
  await expect(page.getByRole('heading', { name: 'Choose a transcript.' })).toBeVisible();
  await expect(page.getByText('14 transcripts found.')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('selection.png'), fullPage: true, animations: 'disabled' });

  await page.getByTestId('transcript-13').click();
  await page.getByRole('button', { name: 'Analyze transcript' }).click();
  await expect(page.getByRole('heading', { name: 'Analyzing transcript.' })).toBeVisible();
  await expect(page.getByRole('heading', {
    name: demoMode ? 'Alyssa Renee Thompson' : 'Tamika Renee Johnson',
  })).toBeVisible({ timeout: 6000 });
  await expect(page.getByRole('heading', { name: 'Sign this case.' })).toBeVisible();
  await expect(page.locator('.review-grid')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: testInfo.outputPath('review.png'), fullPage: true, animations: 'disabled' });

  const damages = page.getByRole('article').filter({ hasText: 'Damages' });
  await damages.getByRole('button', { name: 'See details →' }).click();
  await expect(damages.getByRole('button', { name: 'See details ↓' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Damages details' })).toBeVisible();
  await expect(page.getByText('Transcript evidence')).toBeVisible();
  if (demoMode) {
    await expect(page.getByRole('region', { name: 'Damages details' })).toContainText('$58,400');
    await expect(page.getByRole('region', { name: 'Damages details' })).toContainText('Peachtree Regional Hospital');
  }
  await page.screenshot({ path: testInfo.outputPath('details.png'), fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'See source in transcript →' }).click();
  await expect(page.getByRole('dialog', { name: 'Call transcript' })).toBeVisible();
  if (demoMode) {
    await expect(page.getByRole('dialog', { name: 'Call transcript' })).toContainText('Alyssa Renee Thompson');
  }
  await page.locator('.drawer .close').click();

  await page.getByRole('button', { name: 'Hold for review' }).click();
  await expect(page.getByText('Case held for attorney review.')).toBeVisible();
  if (demoMode) expect(apiRequests).toEqual([]);
});
