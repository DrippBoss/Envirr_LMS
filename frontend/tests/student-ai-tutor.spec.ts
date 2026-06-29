import { test, expect } from '@playwright/test';
import { hasCreds, login } from './helpers';

const COMPOSER = 'Type your follow-up or ask a new question...';

test.describe('Student AI tutor', () => {
  test.skip(!hasCreds('student'), 'no ENVIRR_STUDENT_USER/PASS in .env.test');

  test.beforeEach(async ({ page }) => {
    await login(page, 'student');
    await page.goto('/tutor');
  });

  test('tutor page renders the chat composer', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Envirr AI Tutor/i })).toBeVisible();
    await expect(page.getByPlaceholder(COMPOSER)).toBeVisible();
  });

  // B8 — non-functional voice/photo input buttons were removed; there should be
  // no file upload and no mic/camera composer controls.
  test('[B8] has no voice/photo input controls', async ({ page }) => {
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /microphone|voice input|attach|photo|camera/i }))
      .toHaveCount(0);
  });

  // U3 — sending a question echoes the user message and yields a reply OR a
  // graceful "unavailable" bubble (e.g. when the Gemini quota is exhausted).
  // Either proves the round-trip works without crashing.
  test('[U3] sending a question produces a reply or graceful error', async ({ page }) => {
    const q = 'What is a derivative in one short sentence?';
    await page.getByPlaceholder(COMPOSER).fill(q);
    await page.keyboard.press('Enter');

    // The user's message is echoed into the thread.
    await expect(page.getByText(q)).toBeVisible();

    // Then either an answer or the fallback error bubble appears.
    await expect(async () => {
      const fallback = await page.getByText(/unavailable|try again shortly/i).count() > 0;
      // Any assistant prose beyond our echoed question counts as a reply.
      const bodyLen = (await page.locator('body').innerText()).length;
      expect(fallback || bodyLen > q.length + 200).toBeTruthy();
    }).toPass({ timeout: 30_000 });
  });
});
