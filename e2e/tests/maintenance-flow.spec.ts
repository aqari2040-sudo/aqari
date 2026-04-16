import { test, expect } from '../fixtures/auth.fixture';

test.describe('Maintenance Flow', () => {
  test('create maintenance request form submits', async ({ tenantPage }) => {
    await tenantPage.goto('/en/dashboard/maintenance');

    // Open create form
    const newRequestButton = tenantPage
      .getByRole('button', { name: /new request|create request|report issue/i })
      .or(tenantPage.getByRole('link', { name: /new request|create request/i }));
    await expect(newRequestButton).toBeVisible({ timeout: 8_000 });
    await newRequestButton.click();

    // Fill in required fields
    const categorySelect = tenantPage.locator('select[name="category"]')
      .or(tenantPage.locator('[data-testid="category-select"]'));
    if (await categorySelect.count() > 0) {
      await categorySelect.selectOption({ index: 1 });
    }

    const descriptionInput = tenantPage.locator('textarea[name="description"]')
      .or(tenantPage.getByLabel(/description/i));
    await expect(descriptionInput).toBeVisible({ timeout: 3_000 });
    await descriptionInput.fill('The kitchen sink is leaking and causing water damage.');

    const prioritySelect = tenantPage.locator('select[name="priority"]')
      .or(tenantPage.locator('[data-testid="priority-select"]'));
    if (await prioritySelect.count() > 0) {
      await prioritySelect.selectOption('high');
    }

    // Submit
    await tenantPage.getByRole('button', { name: /submit|create|send/i }).click();

    // Should see success feedback and/or redirect
    await tenantPage.waitForURL(/\/maintenance/, { timeout: 8_000 });
    await expect(
      tenantPage.getByText(/submitted|created|request received/i)
        .or(tenantPage.getByText(/kitchen sink is leaking/i)),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('duplicate detection shows warning for same unit+category', async ({ tenantPage }) => {
    await tenantPage.goto('/en/dashboard/maintenance');

    const newRequestButton = tenantPage
      .getByRole('button', { name: /new request|create request|report issue/i })
      .or(tenantPage.getByRole('link', { name: /new request|create request/i }));
    await newRequestButton.click();

    // Select the same category that has an existing open request for this tenant's unit
    const categorySelect = tenantPage.locator('select[name="category"]')
      .or(tenantPage.locator('[data-testid="category-select"]'));
    if (await categorySelect.count() > 0) {
      // Pick the first available category — assumes the tenant already has one open
      await categorySelect.selectOption({ index: 1 });
    }

    // Fill description
    const descriptionInput = tenantPage.locator('textarea[name="description"]')
      .or(tenantPage.getByLabel(/description/i));
    await descriptionInput.fill('Same issue as before.');

    // After selecting category (or on submit), a duplicate warning should appear
    const duplicateWarning = tenantPage
      .getByText(/duplicate|similar request already exists|already an open request/i)
      .or(tenantPage.locator('[data-testid="duplicate-warning"]'));

    await expect(duplicateWarning).toBeVisible({ timeout: 5_000 });
  });

  test('employee adds cost to maintenance request', async ({ employeePage }) => {
    await employeePage.goto('/en/dashboard/maintenance');

    // Find an in-progress or submitted request
    const requestRow = employeePage
      .locator('tr', { has: employeePage.getByText(/submitted|in.progress/i) })
      .or(employeePage.locator('[data-testid="maintenance-row"]').first())
      .first();

    await expect(requestRow).toBeVisible({ timeout: 8_000 });
    await requestRow.click();

    // Add cost details
    const costInput = employeePage.locator('input[name="cost"]')
      .or(employeePage.locator('input[name="actual_cost"]'))
      .or(employeePage.getByLabel(/cost/i));
    await expect(costInput).toBeVisible({ timeout: 5_000 });
    await costInput.clear();
    await costInput.fill('750');

    const notesInput = employeePage.locator('textarea[name="notes"]')
      .or(employeePage.getByLabel(/notes|remarks/i));
    if (await notesInput.count() > 0) {
      await notesInput.fill('Replaced the faucet and fixed the drain pipe.');
    }

    // Submit the cost update
    await employeePage.getByRole('button', { name: /add cost|update cost|save/i }).click();

    // Confirm cost is reflected
    await expect(employeePage.getByText(/750/)).toBeVisible({ timeout: 5_000 });
  });

  test('owner approves cost', async ({ ownerPage }) => {
    await ownerPage.goto('/en/dashboard/maintenance');

    // Find a request with a cost pending owner approval
    const pendingApprovalRow = ownerPage
      .locator('tr', { has: ownerPage.getByText(/pending approval|awaiting approval/i) })
      .or(ownerPage.locator('[data-testid="maintenance-row"]', {
        has: ownerPage.getByText(/pending/i),
      }))
      .first();

    await expect(pendingApprovalRow).toBeVisible({ timeout: 8_000 });
    await pendingApprovalRow.click();

    // Approve the cost
    const approveButton = ownerPage.getByRole('button', { name: /approve/i });
    await expect(approveButton).toBeVisible({ timeout: 5_000 });
    await approveButton.click();

    // A confirmation dialog might appear
    const confirmDialog = ownerPage.getByRole('dialog');
    if (await confirmDialog.isVisible()) {
      await ownerPage.getByRole('button', { name: /confirm|yes/i }).last().click();
    }

    // Status should update to approved
    await expect(ownerPage.getByText(/approved/i)).toBeVisible({ timeout: 5_000 });
  });
});
