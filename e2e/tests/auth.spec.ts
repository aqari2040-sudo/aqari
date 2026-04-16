import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('login page renders with email/phone toggle', async ({ page }) => {
    await page.goto('/en/login');

    // Email input should be visible by default
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Toggle to phone login should exist
    const phoneToggle = page.getByRole('button', { name: /phone/i }).or(
      page.getByText(/sign in with phone/i),
    );
    await expect(phoneToggle).toBeVisible();
  });

  test('email login with valid credentials redirects to dashboard', async ({ page }) => {
    await page.goto('/en/login');

    await page.fill('input[type="email"]', 'owner@aqari.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard after successful login
    await page.waitForURL('**/dashboard', { timeout: 10_000 });
    await expect(page).toHaveURL(/\/en\/dashboard/);
  });

  test('invalid credentials shows error message', async ({ page }) => {
    await page.goto('/en/login');

    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should stay on login page and show an error
    await expect(page).toHaveURL(/\/en\/login/);

    const errorMessage = page
      .getByRole('alert')
      .or(page.getByText(/invalid credentials/i))
      .or(page.getByText(/invalid login/i))
      .or(page.locator('[data-testid="auth-error"]'));

    await expect(errorMessage).toBeVisible({ timeout: 5_000 });
  });

  test('language switcher toggles between English and Arabic', async ({ page }) => {
    await page.goto('/en/login');

    // Verify English is active
    await expect(page).toHaveURL(/\/en\//);

    // Find the language switcher and switch to Arabic
    const langSwitcher = page
      .getByRole('button', { name: /ar|arabic|عربي/i })
      .or(page.getByLabel(/language/i))
      .or(page.locator('[data-testid="lang-switcher"]'));

    await langSwitcher.click();

    // Should navigate to the Arabic version of the page
    await page.waitForURL(/\/ar\//, { timeout: 5_000 });
    await expect(page).toHaveURL(/\/ar\//);

    // Page should have dir="rtl" for Arabic
    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'rtl');
  });
});
