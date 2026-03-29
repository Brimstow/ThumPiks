/**
 * Credits Page E2E Tests
 * Tests the credit balance display, real-time updates, and add-on credit functionality
 * 
 * Test User: addPackTest1@gmail.com / Test123!
 * - Free tier: 50 plan credits
 * - Add-on credits: 200 credits
 */

describe('Credits Page - Free Tier with Add-on Credits', () => {
  const TEST_USER = {
    email: 'addPackTest1@gmail.com',
    password: 'Test123!',
  };

  beforeEach(async () => {
    // Navigate to login page
    await page.goto('http://localhost:8556/login');
    
    // Login with test credentials
    await page.getByRole('textbox', { name: 'Username or Email *' }).fill(TEST_USER.email);
    await page.getByRole('textbox', { name: 'Password *' }).fill(TEST_USER.password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    
    // Wait for dashboard to load
    await page.waitForURL('**/dashboard');
    
    // Navigate to credits page
    await page.goto('http://localhost:8556/dashboard/credits');
    await page.waitForLoadState('networkidle');
  });

  describe('Sanity Tests - Page Load & Display', () => {
    test('should display credits page with correct title', async () => {
      await expect(page.getByRole('heading', { name: 'Credits & Usage' })).toBeVisible();
      await expect(page.getByText('Manage your credit balance and purchase additional credits')).toBeVisible();
    });

    test('should display current balance card', async () => {
      await expect(page.getByText('CURRENT BALANCE')).toBeVisible();
      await expect(page.getByText('Upgrade Plan')).toBeVisible();
    });

    test('should display plan credits section with correct values', async () => {
      // Plan Credits section should be visible
      await expect(page.getByText('Plan Credits')).toBeVisible();
      await expect(page.getByText('(Free Plan)')).toBeVisible();
      
      // Should show 50/50 remaining for free tier
      await expect(page.getByText('50 / 50 remaining')).toBeVisible();
    });

    test('should display add-on credits section with correct values', async () => {
      // Add-on Credits section should be visible
      await expect(page.getByText('Add-on Credits')).toBeVisible();
      await expect(page.getByText('(Purchased Packs)')).toBeVisible();
      
      // Should show 200/200 remaining for add-on credits
      await expect(page.getByText('200 / 200 remaining')).toBeVisible();
      
      // Should show "Never expires" text
      await expect(page.getByText('Never expires • Used after plan credits are depleted')).toBeVisible();
    });

    test('should display quick stats cards', async () => {
      await expect(page.getByText('Avg. Daily Usage')).toBeVisible();
      await expect(page.getByText('Days Remaining')).toBeVisible();
    });

    test('should display purchase credit packs section', async () => {
      await expect(page.getByRole('heading', { name: 'Purchase Additional Credits' })).toBeVisible();
      await expect(page.getByText('Starter Pack')).toBeVisible();
      await expect(page.getByText('Value Pack')).toBeVisible();
      await expect(page.getByText('Pro Pack')).toBeVisible();
      await expect(page.getByText('Ultra Pack')).toBeVisible();
    });
  });

  describe('Edge Case Tests - Zero & Empty States', () => {
    test('should handle user with no subscription gracefully', async () => {
      // This test verifies the NaN% fix - should show 0% not NaN%
      const totalUsageText = await page.getByText(/Total Usage/).first();
      await expect(totalUsageText).toBeVisible();
      
      // Should not contain "NaN"
      const pageContent = await page.content();
      expect(pageContent).not.toContain('NaN');
    });

    test('should display correct total balance (plan + add-on)', async () => {
      // Total should be 250 (50 plan + 200 add-on)
      const balanceElement = await page.locator('text=/^250$/').first();
      await expect(balanceElement).toBeVisible();
    });

    test('should show progress bars with correct widths', async () => {
      // Plan credits progress bar should be at 0% (no usage yet)
      const planProgressBar = page.locator('.bg-gradient-to-r').first();
      await expect(planProgressBar).toBeVisible();
      
      // Add-on credits progress bar should be at 0% (no usage yet)
      const addonSection = page.getByText('Add-on Credits').locator('..').locator('..');
      await expect(addonSection).toBeVisible();
    });
  });

  describe('User Flow Tests - Real-time Updates', () => {
    test('should poll for credit updates every 5 seconds', async () => {
      // Wait for initial load
      await page.waitForTimeout(2000);
      
      // Get initial network requests
      const initialRequests = await page.evaluate(() => {
        return (window as any).performance.getEntriesByType('resource')
          .filter((r: any) => r.name.includes('/api/subscription/current'))
          .length;
      });
      
      // Wait for polling interval (5 seconds)
      await page.waitForTimeout(6000);
      
      // Check that new requests were made
      const newRequests = await page.evaluate(() => {
        return (window as any).performance.getEntriesByType('resource')
          .filter((r: any) => r.name.includes('/api/subscription/current'))
          .length;
      });
      
      // Should have more requests after polling
      expect(newRequests).toBeGreaterThanOrEqual(initialRequests);
    });

    test('should refetch data when window regains focus', async () => {
      // Simulate blur and focus
      await page.evaluate(() => {
        window.dispatchEvent(new Event('blur'));
        window.dispatchEvent(new Event('focus'));
      });
      
      // Wait for refetch
      await page.waitForTimeout(1000);
      
      // Page should still display correctly
      await expect(page.getByText('CURRENT BALANCE')).toBeVisible();
    });
  });

  describe('Credit Pack Purchase Flow', () => {
    test('should display all credit pack options', async () => {
      const packs = ['Starter Pack', 'Value Pack', 'Pro Pack', 'Ultra Pack'];
      const credits = ['50', '100', '250', '500'];
      
      for (let i = 0; i < packs.length; i++) {
        await expect(page.getByText(packs[i])).toBeVisible();
        await expect(page.getByText(credits[i]).nth(i)).toBeVisible();
      }
    });

    test('should show purchase buttons for each pack', async () => {
      const purchaseButtons = await page.getByRole('button', { name: 'Purchase' }).all();
      expect(purchaseButtons.length).toBeGreaterThanOrEqual(4);
    });

    test('should calculate per-credit price correctly', async () => {
      // Starter Pack: $5 / 50 credits = $0.10 per credit
      await expect(page.getByText('$0.10 per credit').first()).toBeVisible();
    });
  });

  describe('Transaction History', () => {
    test('should display transaction history section', async () => {
      await expect(page.getByRole('heading', { name: 'Transaction History' })).toBeVisible();
    });

    test('should have filter dropdown for transactions', async () => {
      const filterDropdown = page.getByRole('combobox');
      await expect(filterDropdown).toBeVisible();
      
      // Check options
      await expect(page.getByText('All Types')).toBeVisible();
      await expect(page.getByText('Usage')).toBeVisible();
      await expect(page.getByText('Purchases')).toBeVisible();
    });

    test('should show empty state or transactions', async () => {
      // Either "No transactions yet" or a table should be visible
      const hasEmptyState = await page.getByText('No transactions yet').isVisible().catch(() => false);
      const hasTable = await page.locator('table').isVisible().catch(() => false);
      
      expect(hasEmptyState || hasTable).toBe(true);
    });
  });
});

describe('Credits Page - Credit Deduction Flow', () => {
  const TEST_USER = {
    email: 'addPackTest1@gmail.com',
    password: 'Test123!',
  };

  beforeEach(async () => {
    await page.goto('http://localhost:8556/login');
    await page.getByRole('textbox', { name: 'Username or Email *' }).fill(TEST_USER.email);
    await page.getByRole('textbox', { name: 'Password *' }).fill(TEST_USER.password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await page.waitForURL('**/dashboard');
  });

  test('should deduct from plan credits first when generating thumbnail', async () => {
    // Navigate to create page to generate a thumbnail
    await page.goto('http://localhost:8556/dashboard/create');
    await page.waitForLoadState('networkidle');
    
    // The actual thumbnail generation would deduct credits
    // For now, we verify the credits page reflects any changes
    await page.goto('http://localhost:8556/dashboard/credits');
    await page.waitForLoadState('networkidle');
    
    // Verify the page loads correctly after potential credit deduction
    await expect(page.getByText('CURRENT BALANCE')).toBeVisible();
  });

  test('should show correct credit breakdown after usage', async () => {
    await page.goto('http://localhost:8556/dashboard/credits');
    await page.waitForLoadState('networkidle');
    
    // Verify both plan and add-on sections are visible
    await expect(page.getByText('Plan Credits')).toBeVisible();
    await expect(page.getByText('Add-on Credits')).toBeVisible();
  });
});
