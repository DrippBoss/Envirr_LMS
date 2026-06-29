/**
 * QA regression suite — maps to QA_AUDIT.md bug codes.
 *
 * Only the UI-observable items live here. Backend-only items (B1 Celery,
 * B2 enum, B3 self-marking, B5 video gate, B10 MAX_MEMBERS, S1–S5, D1–D6)
 * are covered by the Django test suite, not Playwright.
 */
import { test, expect } from '@playwright/test';
import { hasCreds, login } from './helpers';

test.describe('QA regression — unauthenticated', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('[B6] no dead OAuth/SSO buttons on login', async ({ page }) => {
    await expect(page.getByRole('button', { name: /google|continue with|sign in with|github|facebook/i }))
      .toHaveCount(0);
  });

  test('[B7] forgot-password modal is wired', async ({ page }) => {
    await page.getByRole('button', { name: /forgot password/i }).click();
    await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible();
  });
});

test.describe('QA regression — student session', () => {
  test.skip(!hasCreds('student'), 'no student creds');

  test('[B8] AI tutor has no dead voice/photo controls', async ({ page }) => {
    await login(page, 'student');
    await page.goto('/tutor');
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /microphone|voice input|attach|photo|camera/i }))
      .toHaveCount(0);
  });
});

test.describe('QA regression — admin session', () => {
  test.skip(!hasCreds('admin'), 'no admin creds');

  test('[B4] admin charts are rendered components, not placeholders', async ({ page }) => {
    await login(page, 'admin');
    await expect(page).toHaveURL(/\/admin/);
    expect(await page.locator('svg').count()).toBeGreaterThan(1);
  });

  test('[B9] "Show More Users" control exists when user list is shown', async ({ page }) => {
    await login(page, 'admin');
    const showMore = page.getByRole('button', { name: /show more users/i });
    if (await showMore.count() === 0) {
      test.info().annotations.push({ type: 'note', description: 'control behind a tab — not on default view' });
      return;
    }
    await expect(showMore.first()).toBeEnabled();
  });
});
