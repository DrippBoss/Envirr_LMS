import { test, expect } from '@playwright/test';
import { hasCreds, login } from './helpers';

test.describe('Login page (unauthenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('renders branding + credential form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Mission Control' })).toBeVisible();
    await expect(page.getByTestId('login-username')).toBeVisible();
    await expect(page.getByTestId('login-password')).toBeVisible();
    await expect(page.getByTestId('login-submit')).toBeVisible();
  });

  // B6 — OAuth/SSO dead buttons were removed.
  test('[B6] has no OAuth / SSO buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /google|continue with|sign in with|github|facebook/i }))
      .toHaveCount(0);
  });

  // B7 — Forgot-password is wired to a real modal + endpoint.
  test('[B7] forgot-password opens the reset modal', async ({ page }) => {
    await page.getByRole('button', { name: /forgot password/i }).click();
    await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible();
    await expect(page.getByPlaceholder(/username or email/i)).toBeVisible();
  });

  test('rejects bad credentials with an inline error', async ({ page }) => {
    await page.getByTestId('login-username').fill('definitely-not-a-real-user');
    await page.getByTestId('login-password').fill('wrong-password-123');
    await page.getByTestId('login-submit').click();
    // Stays on /login and surfaces an error banner — never silently navigates.
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('.text-error, [class*="text-error"]').first()).toBeVisible();
  });
});

test.describe('Login flow (authenticated)', () => {
  test('student can log in and reach the app', async ({ page }) => {
    test.skip(!hasCreds('student'), 'no ENVIRR_STUDENT_USER/PASS in .env.test');
    await login(page, 'student');
    // Landed on the student dashboard (greeting) — not stuck on /login.
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByText(/Good (morning|afternoon|evening)/)).toBeVisible();
  });
});
