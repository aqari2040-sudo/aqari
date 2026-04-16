import path from 'path';
import { test, expect } from '../fixtures/auth.fixture';

test.describe('Receipt Upload Flow', () => {
  test('upload receipt page shows file upload and billing period selector', async ({ tenantPage }) => {
    // Tenant navigates to payment/receipt upload area
    await tenantPage.goto('/en/dashboard/payments');

    const uploadButton = tenantPage
      .getByRole('button', { name: /upload receipt/i })
      .or(tenantPage.getByRole('link', { name: /upload receipt/i }));
    await expect(uploadButton).toBeVisible({ timeout: 8_000 });
    await uploadButton.click();

    // File upload input should be present
    const fileInput = tenantPage.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();

    // Billing period selector (month/year dropdowns or date picker) should be present
    const periodSelector = tenantPage
      .locator('select[name="billing_month"], select[name="billing_year"]')
      .or(tenantPage.locator('[data-testid="billing-period"]'))
      .or(tenantPage.getByLabel(/billing period/i));
    await expect(periodSelector.first()).toBeVisible({ timeout: 3_000 });
  });

  test('after upload, payment appears in pending review', async ({ tenantPage }) => {
    await tenantPage.goto('/en/dashboard/payments');

    const uploadButton = tenantPage
      .getByRole('button', { name: /upload receipt/i })
      .or(tenantPage.getByRole('link', { name: /upload receipt/i }));
    await uploadButton.click();

    // Attach a dummy PDF/image file
    const fileInput = tenantPage.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'receipt-test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 test receipt content'),
    });

    // Select billing period if selects are present
    const monthSelect = tenantPage.locator('select[name="billing_month"]');
    if (await monthSelect.count() > 0) {
      await monthSelect.selectOption({ index: 1 });
    }
    const yearSelect = tenantPage.locator('select[name="billing_year"]');
    if (await yearSelect.count() > 0) {
      await yearSelect.selectOption({ label: '2026' });
    }

    // Fill amount if required
    const amountInput = tenantPage.locator('input[name="amount"]');
    if (await amountInput.count() > 0) {
      await amountInput.fill('5000');
    }

    // Submit the upload
    await tenantPage.getByRole('button', { name: /submit|upload/i }).click();

    // Navigate to payments list and verify pending_review status badge appears
    await tenantPage.goto('/en/dashboard/payments');
    const pendingBadge = tenantPage.getByText(/pending review/i).first();
    await expect(pendingBadge).toBeVisible({ timeout: 8_000 });
  });

  test('employee confirms payment with correct amounts', async ({ employeePage }) => {
    await employeePage.goto('/en/dashboard/payments');

    // Filter or find a payment in pending_review
    const pendingRow = employeePage
      .locator('tr', { has: employeePage.getByText(/pending review/i) })
      .or(employeePage.locator('[data-testid="payment-row"]', { has: employeePage.getByText(/pending review/i) }))
      .first();

    await expect(pendingRow).toBeVisible({ timeout: 8_000 });

    // Click to open the payment detail / review page
    await pendingRow.click();

    // Confirm amount fields are editable
    const confirmedAmountInput = employeePage.locator('input[name="confirmed_amount"]')
      .or(employeePage.getByLabel(/confirmed amount/i));
    await expect(confirmedAmountInput).toBeVisible({ timeout: 5_000 });
    await confirmedAmountInput.clear();
    await confirmedAmountInput.fill('5000');

    // Click confirm
    await employeePage.getByRole('button', { name: /confirm/i }).click();

    // Status should update to confirmed
    await expect(employeePage.getByText(/confirmed/i)).toBeVisible({ timeout: 5_000 });
  });

  test('rejected payment shows rejection reason', async ({ employeePage }) => {
    await employeePage.goto('/en/dashboard/payments');

    // Find a pending_review payment
    const pendingRow = employeePage
      .locator('tr', { has: employeePage.getByText(/pending review/i) })
      .or(employeePage.locator('[data-testid="payment-row"]', { has: employeePage.getByText(/pending review/i) }))
      .first();

    await expect(pendingRow).toBeVisible({ timeout: 8_000 });
    await pendingRow.click();

    // Click reject
    await employeePage.getByRole('button', { name: /reject/i }).click();

    // A reason field or dialog should appear
    const reasonInput = employeePage.locator('textarea[name="rejection_reason"]')
      .or(employeePage.getByLabel(/rejection reason/i))
      .or(employeePage.getByPlaceholder(/reason/i));
    await expect(reasonInput).toBeVisible({ timeout: 3_000 });

    await reasonInput.fill('Receipt image is unclear and amount does not match.');

    // Confirm the rejection
    await employeePage.getByRole('button', { name: /confirm reject|submit/i }).click();

    // Status should update to rejected and reason should be visible in the detail
    await expect(employeePage.getByText(/rejected/i)).toBeVisible({ timeout: 5_000 });
    await expect(
      employeePage.getByText(/receipt image is unclear/i),
    ).toBeVisible({ timeout: 3_000 });
  });
});
