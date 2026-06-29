import { Page, expect } from '@playwright/test';

export type Role = 'student' | 'teacher' | 'admin';

/** Credentials for a role, or null if not configured in .env.test. */
export function creds(role: Role): { user: string; pass: string } | null {
  const u = process.env[`ENVIRR_${role.toUpperCase()}_USER`];
  const p = process.env[`ENVIRR_${role.toUpperCase()}_PASS`];
  return u && p ? { user: u, pass: p } : null;
}

export function hasCreds(role: Role): boolean {
  return creds(role) !== null;
}

/**
 * Log in through the real UI (cookie-based auth). After a successful login the
 * app does `window.location.href = "/"`, then RoleHome redirects by role:
 *   student → "/" (StudentDashboard)   teacher → "/teacher"   admin → "/admin"
 * Resolves once we've landed somewhere that isn't /login.
 */
export async function login(page: Page, role: Role): Promise<void> {
  const c = creds(role);
  if (!c) throw new Error(`No credentials for role "${role}" — set them in .env.test`);

  await page.goto('/login');
  await page.getByTestId('login-username').fill(c.user);
  await page.getByTestId('login-password').fill(c.pass);
  await page.getByTestId('login-submit').click();

  // Wait until the SPA bootstrap has moved us off the login screen.
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
}
