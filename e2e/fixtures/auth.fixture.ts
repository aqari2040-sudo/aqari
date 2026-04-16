import { test as base, Page } from '@playwright/test';

export const test = base.extend<{
  ownerPage: Page;
  employeePage: Page;
  tenantPage: Page;
}>({
  ownerPage: async ({ browser }, use) => {
    const page = await browser.newPage();
    await page.goto('/en/login');
    await page.fill('input[type="email"]', 'owner@aqari.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    await use(page);
    await page.close();
  },
  employeePage: async ({ browser }, use) => {
    const page = await browser.newPage();
    await page.goto('/en/login');
    await page.fill('input[type="email"]', 'employee@aqari.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    await use(page);
    await page.close();
  },
  tenantPage: async ({ browser }, use) => {
    // Tenant logs in via phone OTP - mock this
    const page = await browser.newPage();
    // For E2E, we might use email login for tenants too
    await page.goto('/en/login');
    await page.fill('input[type="email"]', 'tenant@aqari.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await use(page);
    await page.close();
  },
});

export { expect } from '@playwright/test';
