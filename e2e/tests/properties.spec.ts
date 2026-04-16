import { test, expect } from '../fixtures/auth.fixture';

test.describe('Properties CRUD', () => {
  test('properties page shows list of properties', async ({ ownerPage }) => {
    await ownerPage.goto('/en/dashboard/properties');

    // Page heading should be present
    await expect(ownerPage.getByRole('heading', { name: /properties/i })).toBeVisible();

    // Table or card list renders — at least the headers should exist
    const table = ownerPage.locator('table').or(ownerPage.locator('[data-testid="properties-list"]'));
    await expect(table).toBeVisible({ timeout: 8_000 });

    // Column headers
    await expect(ownerPage.getByText(/name/i).first()).toBeVisible();
  });

  test('create property form submits and redirects to list', async ({ ownerPage }) => {
    await ownerPage.goto('/en/dashboard/properties');

    // Open create form
    await ownerPage.getByRole('link', { name: /add property/i })
      .or(ownerPage.getByRole('button', { name: /add property/i }))
      .or(ownerPage.getByRole('button', { name: /new property/i }))
      .click();

    await ownerPage.waitForURL(/\/properties\/new|\/properties\/create/, { timeout: 5_000 });

    // Fill in the form fields
    await ownerPage.fill('input[name="name"]', 'E2E Test Tower');
    await ownerPage.fill('input[name="address"]', '123 Test Street, Abu Dhabi');

    // Select property type if present
    const typeSelect = ownerPage.locator('select[name="property_type"]')
      .or(ownerPage.locator('[data-testid="property-type-select"]'));
    if (await typeSelect.count() > 0) {
      await typeSelect.selectOption({ index: 1 });
    }

    // Submit the form
    await ownerPage.getByRole('button', { name: /save|create|submit/i }).click();

    // Should redirect back to properties list or property detail
    await ownerPage.waitForURL(/\/properties/, { timeout: 8_000 });
    await expect(ownerPage.getByText('E2E Test Tower')).toBeVisible({ timeout: 5_000 });
  });

  test('property detail page shows unit summary', async ({ ownerPage }) => {
    await ownerPage.goto('/en/dashboard/properties');

    // Click first property in the list
    const firstPropertyLink = ownerPage.getByRole('link', { name: /view|details/i }).first()
      .or(ownerPage.locator('table tbody tr').first())
      .or(ownerPage.locator('[data-testid="property-row"]').first());

    await firstPropertyLink.click();

    // Should be on a property detail page
    await ownerPage.waitForURL(/\/properties\/[^/]+$/, { timeout: 5_000 });

    // Unit summary metrics should be visible
    const unitSummary = ownerPage
      .getByText(/units/i)
      .or(ownerPage.locator('[data-testid="unit-summary"]'));
    await expect(unitSummary.first()).toBeVisible({ timeout: 5_000 });
  });

  test('edit property updates the record', async ({ ownerPage }) => {
    await ownerPage.goto('/en/dashboard/properties');

    // Navigate to edit for the first property
    const editButton = ownerPage.getByRole('button', { name: /edit/i }).first()
      .or(ownerPage.getByRole('link', { name: /edit/i }).first());
    await editButton.click();

    await ownerPage.waitForURL(/\/properties\/[^/]+\/edit/, { timeout: 5_000 });

    // Update the name field
    const nameInput = ownerPage.locator('input[name="name"]');
    await nameInput.clear();
    await nameInput.fill('E2E Updated Tower');

    // Submit
    await ownerPage.getByRole('button', { name: /save|update|submit/i }).click();

    // Should redirect back and show updated name
    await ownerPage.waitForURL(/\/properties/, { timeout: 8_000 });
    await expect(ownerPage.getByText('E2E Updated Tower')).toBeVisible({ timeout: 5_000 });
  });

  test('delete property with confirmation dialog', async ({ ownerPage }) => {
    await ownerPage.goto('/en/dashboard/properties');

    // Click delete on the first property
    const deleteButton = ownerPage.getByRole('button', { name: /delete/i }).first()
      .or(ownerPage.locator('[data-testid="delete-property"]').first());
    await deleteButton.click();

    // Confirmation dialog should appear
    const dialog = ownerPage.getByRole('dialog')
      .or(ownerPage.locator('[data-testid="confirm-dialog"]'));
    await expect(dialog).toBeVisible({ timeout: 3_000 });

    // Confirm the deletion
    await ownerPage.getByRole('button', { name: /confirm|yes|delete/i }).last().click();

    // Dialog should close and list should update
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });
  });
});
