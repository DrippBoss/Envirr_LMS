import { test, expect } from '@playwright/test';
import { hasCreds, login } from './helpers';

test.describe('Student dashboard', () => {
  test.skip(!hasCreds('student'), 'no ENVIRR_STUDENT_USER/PASS in .env.test');

  test.beforeEach(async ({ page }) => {
    await login(page, 'student');
  });

  test('dashboard renders greeting + core sections', async ({ page }) => {
    await expect(page.getByText(/Good (morning|afternoon|evening)/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'My Courses' })).toBeVisible();
  });

  test('navigates to analytics, leaderboard and assignments', async ({ page }) => {
    await page.goto('/analytics');
    await expect(page).toHaveURL(/\/analytics/);
    await expect(page.locator('body')).not.toContainText(/Loading…|Loading\.\.\./);

    await page.goto('/leaderboard');
    await expect(page).toHaveURL(/\/leaderboard/);

    await page.goto('/assignments');
    await expect(page).toHaveURL(/\/assignments/);
  });

  test('study groups page loads', async ({ page }) => {
    await page.goto('/study-groups');
    await expect(page).toHaveURL(/\/study-groups/);
    await expect(page.locator('body')).not.toContainText(/Application error|Something went wrong/i);
  });
});
