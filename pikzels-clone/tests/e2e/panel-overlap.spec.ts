import { test, expect, Page } from '@playwright/test';

/**
 * E2E Test: Floating Panel Overlap Detection
 * 
 * Tests that all tool buttons remain visible and clickable at various viewport sizes.
 * Verifies that floating panels, zoom controls, and tool settings don't overlap
 * and block interaction with tool buttons.
 * 
 * Run with: npx playwright test tests/e2e/panel-overlap.spec.ts --project=chromium
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:8556';

// All tool buttons that must remain accessible
const ALL_TOOLS = [
  { id: 'select', label: 'Select', shortcut: 'V' },
  { id: 'smart-select', label: 'Smart Select (AI)', shortcut: 'W' },
  { id: 'move', label: 'Move', shortcut: 'M' },
  { id: 'brush', label: 'Brush', shortcut: 'B' },
  { id: 'eraser', label: 'Eraser', shortcut: 'E' },
  { id: 'pen', label: 'Pen', shortcut: 'P' },
  { id: 'clone', label: 'Clone Stamp', shortcut: 'K' },
  { id: 'gradient', label: 'Gradient', shortcut: 'J' },
  { id: 'rectangle', label: 'Rectangle', shortcut: 'R' },
  { id: 'ellipse', label: 'Ellipse', shortcut: 'O' },
  { id: 'polygon', label: 'Polygon', shortcut: 'G' },
  { id: 'line', label: 'Line', shortcut: 'L' },
  { id: 'text', label: 'Text', shortcut: 'T' },
  { id: 'eyedropper', label: 'Eyedropper', shortcut: 'I' },
  { id: 'fill', label: 'Fill', shortcut: 'F' },
  { id: 'crop', label: 'Crop', shortcut: 'C' },
  { id: 'hand', label: 'Hand', shortcut: 'H' },
  { id: 'zoom', label: 'Zoom', shortcut: 'Z' },
];

// Viewports to test
const VIEWPORTS = [
  { name: 'Large Desktop', width: 1920, height: 1080 },
  { name: 'Standard Desktop', width: 1440, height: 900 },
  { name: 'Small Desktop', width: 1280, height: 720 },
  { name: 'Laptop', width: 1024, height: 768 },
  { name: 'Small Laptop', width: 1024, height: 600 },
];

// Helper: get tool button locator
function toolBtn(page: Page, tool: typeof ALL_TOOLS[0]) {
  return page.locator(`button.tool-button[title="${tool.label} (${tool.shortcut})"]`);
}

// Helper: check if element is within viewport bounds
async function isInViewport(page: Page, locator: ReturnType<typeof page.locator>): Promise<boolean> {
  const box = await locator.boundingBox();
  if (!box) return false;
  const viewport = page.viewportSize();
  if (!viewport) return false;
  return (
    box.x >= 0 &&
    box.y >= 0 &&
    box.x + box.width <= viewport.width &&
    box.y + box.height <= viewport.height
  );
}

// Helper: check if element is clickable (not covered by another element)
async function isClickable(page: Page, locator: ReturnType<typeof page.locator>): Promise<boolean> {
  try {
    const box = await locator.boundingBox();
    if (!box) return false;
    
    // Use elementFromPoint to check what's at the center of the element
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    
    const result = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      if (!el) return { tag: 'null', classes: '' };
      // Walk up to find if it's inside a tool-button
      let current: Element | null = el;
      while (current) {
        if (current.classList?.contains('tool-button')) return { tag: 'tool-button', classes: current.className };
        current = current.parentElement;
      }
      return { tag: el.tagName, classes: el.className };
    }, { x: centerX, y: centerY });
    
    return result.tag === 'tool-button';
  } catch {
    return false;
  }
}

test.describe('Panel Overlap Detection', () => {
  
  // =========================================================================
  // TEST 1: All tools visible and in-viewport at various sizes
  // =========================================================================
  for (const vp of VIEWPORTS) {
    test(`all tool buttons visible at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/test-studio`);
      await page.waitForSelector('.tools-panel', { timeout: 15000 });
      
      const results: { tool: string; visible: boolean; inViewport: boolean }[] = [];
      
      for (const tool of ALL_TOOLS) {
        const btn = toolBtn(page, tool);
        const visible = await btn.isVisible().catch(() => false);
        const inVp = visible ? await isInViewport(page, btn) : false;
        results.push({ tool: tool.label, visible, inViewport: inVp });
      }
      
      // Log results
      const hidden = results.filter(r => !r.visible);
      const outOfViewport = results.filter(r => r.visible && !r.inViewport);
      
      console.log(`\n📐 ${vp.name} (${vp.width}x${vp.height}):`);
      console.log(`  ✅ Visible & in viewport: ${results.filter(r => r.inViewport).length}/${ALL_TOOLS.length}`);
      if (hidden.length) console.log(`  ❌ Hidden: ${hidden.map(r => r.tool).join(', ')}`);
      if (outOfViewport.length) console.log(`  ⚠️  Out of viewport: ${outOfViewport.map(r => r.tool).join(', ')}`);
      
      // Take screenshot for evidence
      await page.screenshot({ 
        path: `test-screenshots/overlap-${vp.width}x${vp.height}.png`,
        fullPage: true,
      });
      
      // ASSERT: All tools should be visible
      expect(hidden.length, `Hidden tools at ${vp.width}x${vp.height}: ${hidden.map(r => r.tool).join(', ')}`).toBe(0);
      // ASSERT: All tools should be within viewport (scrollable is OK)
      // This will fail if tools overflow below viewport without scrollbar
      expect(outOfViewport.length, `Out-of-viewport tools at ${vp.width}x${vp.height}: ${outOfViewport.map(r => r.tool).join(', ')}`).toBe(0);
    });
  }

  // =========================================================================
  // TEST 2: All tools clickable (not covered by other elements)
  // =========================================================================
  for (const vp of VIEWPORTS) {
    test(`all tool buttons clickable at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/test-studio`);
      await page.waitForSelector('.tools-panel', { timeout: 15000 });
      
      const blocked: string[] = [];
      
      for (const tool of ALL_TOOLS) {
        const btn = toolBtn(page, tool);
        const box = await btn.boundingBox();
        if (!box) {
          blocked.push(`${tool.label} (no bounding box)`);
          continue;
        }
        
        // Check if within viewport first
        const viewport = page.viewportSize()!;
        if (box.y + box.height > viewport.height || box.y < 0) {
          // Tool is outside viewport — need to scroll to it first
          await btn.scrollIntoViewIfNeeded().catch(() => {});
        }
        
        const clickable = await isClickable(page, btn);
        if (!clickable) {
          blocked.push(tool.label);
        }
      }
      
      console.log(`\n🖱️  ${vp.name} (${vp.width}x${vp.height}):`);
      if (blocked.length === 0) {
        console.log(`  ✅ All ${ALL_TOOLS.length} tools clickable`);
      } else {
        console.log(`  ❌ Blocked tools (${blocked.length}): ${blocked.join(', ')}`);
      }
      
      expect(blocked.length, `Blocked tools at ${vp.width}x${vp.height}: ${blocked.join(', ')}`).toBe(0);
    });
  }

  // =========================================================================
  // TEST 3: Tool settings panel doesn't push tools out of view
  // =========================================================================
  test('tool settings do not hide bottom tools at 1024x768', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto(`${BASE_URL}/test-studio`);
    await page.waitForSelector('.tools-panel', { timeout: 15000 });
    
    // Select brush (shows color + size + opacity settings)
    const brushBtn = toolBtn(page, ALL_TOOLS.find(t => t.id === 'brush')!);
    await brushBtn.click();
    
    // Wait for settings panel to appear
    await page.waitForSelector('.tools-panel__settings', { timeout: 5000 });
    console.log('  ✓ Brush settings panel visible');
    
    // Check that the last tools (hand, zoom) are still accessible
    const handBtn = toolBtn(page, ALL_TOOLS.find(t => t.id === 'hand')!);
    const zoomBtn = toolBtn(page, ALL_TOOLS.find(t => t.id === 'zoom')!);
    
    // Scroll to them if needed
    await handBtn.scrollIntoViewIfNeeded().catch(() => {});
    const handVisible = await handBtn.isVisible().catch(() => false);
    const handClickable = handVisible ? await isClickable(page, handBtn) : false;
    
    await zoomBtn.scrollIntoViewIfNeeded().catch(() => {});
    const zoomVisible = await zoomBtn.isVisible().catch(() => false);
    const zoomClickable = zoomVisible ? await isClickable(page, zoomBtn) : false;
    
    console.log(`  Hand tool: visible=${handVisible}, clickable=${handClickable}`);
    console.log(`  Zoom tool: visible=${zoomVisible}, clickable=${zoomClickable}`);
    
    await page.screenshot({ path: 'test-screenshots/overlap-settings-expanded.png' });
    
    expect(handVisible, 'Hand tool should be visible with settings expanded').toBe(true);
    expect(zoomVisible, 'Zoom tool should be visible with settings expanded').toBe(true);
    expect(handClickable, 'Hand tool should be clickable with settings expanded').toBe(true);
    expect(zoomClickable, 'Zoom tool should be clickable with settings expanded').toBe(true);
  });

  // =========================================================================
  // TEST 4: Zoom controls don't overlap with tools panel
  // =========================================================================
  test('zoom controls do not overlap tools panel', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto(`${BASE_URL}/test-studio`);
    await page.waitForSelector('.tools-panel', { timeout: 15000 });
    
    const toolsPanel = page.locator('.tools-panel');
    const zoomControl = page.locator('.zoom-control');
    
    const toolsBox = await toolsPanel.boundingBox();
    const zoomBox = await zoomControl.boundingBox();
    
    if (toolsBox && zoomBox) {
      // Check horizontal overlap: zoom controls should not be inside tools panel area
      const horizontalOverlap = 
        zoomBox.x < toolsBox.x + toolsBox.width && 
        zoomBox.x + zoomBox.width > toolsBox.x;
      const verticalOverlap = 
        zoomBox.y < toolsBox.y + toolsBox.height && 
        zoomBox.y + zoomBox.height > toolsBox.y;
      const overlaps = horizontalOverlap && verticalOverlap;
      
      console.log(`  Tools panel: x=${toolsBox.x}, y=${toolsBox.y}, w=${toolsBox.width}, h=${toolsBox.height}`);
      console.log(`  Zoom control: x=${zoomBox.x}, y=${zoomBox.y}, w=${zoomBox.width}, h=${zoomBox.height}`);
      console.log(`  Overlap: ${overlaps}`);
      
      expect(overlaps, 'Zoom controls should not overlap tools panel').toBe(false);
    }
  });

  // =========================================================================
  // TEST 5: Floating toolbar doesn't block panel tabs
  // =========================================================================
  test('right panel tabs are all clickable', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${BASE_URL}/test-studio`);
    await page.waitForSelector('.panels-tabs', { timeout: 15000 });
    
    const tabs = ['Layers', 'Video', 'AI', 'Adjust', 'Props'];
    const blocked: string[] = [];
    
    for (const tabName of tabs) {
      const tab = page.locator(`.panels-tab:has-text("${tabName}")`);
      try {
        await tab.click({ timeout: 3000 });
        await expect(tab).toHaveClass(/panels-tab--active/);
        console.log(`  ✅ ${tabName} tab clickable`);
      } catch {
        blocked.push(tabName);
        console.log(`  ❌ ${tabName} tab NOT clickable`);
      }
    }
    
    expect(blocked.length, `Blocked tabs: ${blocked.join(', ')}`).toBe(0);
  });

  // =========================================================================
  // TEST 6: Tools panel scrolls properly when content overflows
  // =========================================================================
  test('tools panel is scrollable when content overflows', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 600 });
    await page.goto(`${BASE_URL}/test-studio`);
    await page.waitForSelector('.tools-panel', { timeout: 15000 });
    
    // Check if tools panel has overflow content
    const overflowInfo = await page.evaluate(() => {
      const panel = document.querySelector('.tools-panel');
      if (!panel) return { scrollHeight: 0, clientHeight: 0, overflows: false, scrollable: false };
      const style = getComputedStyle(panel);
      return {
        scrollHeight: panel.scrollHeight,
        clientHeight: panel.clientHeight,
        overflows: panel.scrollHeight > panel.clientHeight,
        scrollable: style.overflowY === 'auto' || style.overflowY === 'scroll',
        overflowY: style.overflowY,
      };
    });
    
    console.log(`\n📜 Tools panel overflow at 1024x600:`);
    console.log(`  scrollHeight: ${overflowInfo.scrollHeight}px`);
    console.log(`  clientHeight: ${overflowInfo.clientHeight}px`);
    console.log(`  overflows: ${overflowInfo.overflows}`);
    console.log(`  overflowY: ${overflowInfo.overflowY}`);
    console.log(`  scrollable: ${overflowInfo.scrollable}`);
    
    if (overflowInfo.overflows) {
      // If content overflows, verify scrolling works
      expect(overflowInfo.scrollable, 'Tools panel should be scrollable when content overflows').toBe(true);
      
      // Try scrolling to the last tool
      const zoomBtn = toolBtn(page, ALL_TOOLS.find(t => t.id === 'zoom')!);
      await zoomBtn.scrollIntoViewIfNeeded();
      const afterScroll = await isInViewport(page, zoomBtn);
      console.log(`  Zoom tool in viewport after scroll: ${afterScroll}`);
      expect(afterScroll, 'Zoom tool should be scrollable into view').toBe(true);
    }
    
    await page.screenshot({ path: 'test-screenshots/overlap-scroll-test.png' });
  });
});
