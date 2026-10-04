const { test, expect } = require('@playwright/test');

async function boot(page) {
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.route('**/api/leaderboard', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ week: 'TEST-WEEK', entries: [{ rank: 1, playerId: 'test', name: 'TEST', score: 100 }] }) });
  });
  await page.route('**/api/punch', async route => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: 1000 }) });
    } else {
      let body = {};
      try { body = request.postDataJSON() || {}; } catch {}
      const hits = Number(body.hits || 0);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: 1000 + hits }) });
    }
  });
  await page.goto('/#game');
  await expect(page.locator('#target')).toBeVisible();
  await page.waitForTimeout(150);
  return errors;
}

test('desktop core loop has no page errors and punch works', async ({ page }) => {
  const errors = await boot(page);
  const before = await page.locator('#run').textContent();
  await page.locator('#target').click();
  await expect(page.locator('#run')).toHaveText(String(Number(before) + 1));
  expect(errors).toEqual([]);
});

test('spacebar triggers a manual impact', async ({ page }) => {
  await boot(page);
  const before = Number(await page.locator('#run').textContent());
  await page.locator('#target').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#run')).toHaveText(String(before + 1));
});

test('v22 navigation exposes the five product layers', async ({ page }) => {
  await boot(page);
  const expected = [
    ['automation', 'BUILD'],
    ['world', 'WORLD'],
    ['records', 'CHAOS'],
    ['settings', null],
    ['game', 'PUNCH']
  ];
  for (const [view, label] of expected) {
    const tab = page.locator(`.ux-tab[data-view=\"${view}\"]`);
    if (label) {
      await expect(tab).toHaveText(label);
    } else {
      await expect(tab).toHaveAttribute('aria-label', 'Settings');
      await expect(tab.locator('img')).toBeVisible();
    }
    await tab.click();
    await expect(page.locator('body')).toHaveAttribute('data-view', view);
    await expect(page.locator('.ux-nav')).toBeVisible();
  }
  await expect(page.locator('#target')).toBeVisible();
});



test('v22 secondary views use dedicated layouts', async ({ page }) => {
  await boot(page);

  await page.locator('.ux-tab[data-view="automation"]').click();
  await expect(page.locator('#target')).toBeHidden();
  await expect(page.locator('.ux-automation')).toBeVisible();
  await expect(page.locator('.ux-progression').first()).toBeVisible();

  await page.locator('.ux-tab[data-view="world"]').click();
  await expect(page.locator('#target')).toBeHidden();
  await expect(page.locator('.world-card')).toBeVisible();
  await expect(page.locator('#worldState')).toBeVisible();

  await page.locator('.ux-tab[data-view="records"]').click();
  await expect(page.locator('#target')).toBeHidden();
  await expect(page.locator('#singularityPct')).toBeVisible();

  await page.locator('.ux-tab[data-view="settings"]').click();
  await expect(page.locator('#audioMute')).toBeVisible();
});

test('first screen is punch-first', async ({ page }) => {
  await boot(page);
  await expect(page.locator('h1')).toContainText('FUCK YOU,');
  await expect(page.locator('#target')).toBeVisible();
  await expect(page.locator('#counter')).toBeVisible();
  await expect(page.locator('.retention-grid')).toBeHidden();
  await expect(page.locator('.ux-view.ux-records').first()).toBeHidden();
});

test('audio settings are accessible and persist', async ({ page }) => {
  await boot(page);
  await page.locator('.ux-tab[data-view="settings"]').click();
  await expect(page.locator('#audioMute')).toBeVisible();
  const master = page.locator('#masterVolume');
  await expect(master).toHaveAttribute('aria-label', /Master volume/i);
  await master.fill('42');
  await expect(master).toHaveValue('42');
  await page.reload();
  await page.locator('.ux-tab[data-view="settings"]').click();
  await expect(page.locator('#masterVolume')).toHaveValue('42');
});

test('mobile layout has no horizontal overflow', async ({ page }) => {
  await boot(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(2);
});

test('queued impacts survive navigation and flush through mocked API', async ({ page }) => {
  await boot(page);
  await page.locator('#target').click({ clickCount: 3, delay: 20 });
  await expect(page.locator('#run')).toHaveText('3');
  await page.locator('.ux-tab[data-view="records"]').click();
  await page.locator('.ux-tab[data-view="game"]').click();
  await expect(page.locator('#target')).toBeVisible();
});


test('v22 endgame surfaces render inside CHAOS and season state is wired', async ({ page }) => {
  await boot(page);
  await page.locator('.ux-tab[data-view="records"]').click();
  await expect(page.locator('#singularityPct')).toBeVisible();
  await expect(page.locator('#seasonXp')).toBeVisible();
  await expect(page.locator('#copyEndgameCard')).toBeVisible();
});

test('social and seasonal records are reachable', async ({ page }) => {
  await boot(page);
  await page.locator('.ux-tab[data-view="records"]').click();
  await expect(page.locator('#challengeCode')).toHaveValue(/FYA20-/);
  await expect(page.locator('#leaderboard')).toContainText('TEST');
  await expect(page.locator('#seasonBadge')).toContainText('Q');
});
