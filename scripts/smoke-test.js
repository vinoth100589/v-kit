#!/usr/bin/env node
// Maintainer smoke test for the V-Kit landing page (index.html).
//
// Not needed by site visitors, and not needed by anyone downloading
// vkit-free.zip / vkit-pro.zip — this only exercises the landing page's
// own interactive JS (theme switcher, category tabs, skip link, mobile
// nav) so a regression there gets caught before it ships.
//
// Run with: node scripts/smoke-test.js
// Requires Playwright to be available (e.g. `npm i -D playwright`, or any
// environment that already has it installed, such as most CI images).

const { chromium } = require('playwright');
const path = require('path');
const assert = require('node:assert/strict');

const indexPath = 'file://' + path.resolve(__dirname, '..', 'index.html');

const CATEGORY_COUNTS = {
  actions: 7, selection: 11, 'date-and-time': 7, inputs: 11, color: 4,
  overlays: 8, feedback: 6, layout: 8, behaviors: 4, display: 19,
};
const THEME_BG = { light: '#f7f7f5', dark: '#0d1117', ocean: '#0b2027', sunset: '#241209' };
const THEME_SCHEME = { light: 'light', dark: 'dark', ocean: 'dark', sunset: 'dark' };

let passed = 0, failed = 0;
async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ok   - ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL - ${name}\n         ${err.message}`);
  }
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(String(e)));
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  await page.goto(indexPath);

  console.log('Category tabs');
  for (const [tab, count] of Object.entries(CATEGORY_COUNTS)) {
    await check(`tab "${tab}" shows ${count} cards`, async () => {
      await page.click(`[data-tab="${tab}"]`);
      const display = await page.evaluate(
        (t) => getComputedStyle(document.querySelector(`[data-panel="${t}"]`)).display,
        tab
      );
      assert.equal(display, 'block', 'panel should be visible');
      const names = await page.$$eval(`[data-panel="${tab}"] .cname`, (els) => els.length);
      assert.equal(names, count, `expected ${count} cards, got ${names}`);
    });
  }

  console.log('ARIA tabs pattern');
  await check('tablist/tab/tabpanel roles are wired up', async () => {
    const roles = await page.evaluate(() => ({
      tablist: document.getElementById('cat-tabs').getAttribute('role'),
      tab: document.getElementById('tab-display').getAttribute('role'),
      panel: document.getElementById('panel-display').getAttribute('role'),
      labelledby: document.getElementById('panel-display').getAttribute('aria-labelledby'),
    }));
    assert.equal(roles.tablist, 'tablist');
    assert.equal(roles.tab, 'tab');
    assert.equal(roles.panel, 'tabpanel');
    assert.equal(roles.labelledby, 'tab-display');
  });

  await check('arrow-key navigation moves focus and activates the panel', async () => {
    await page.click('[data-tab="actions"]');
    await page.focus('[data-tab="actions"]');
    await page.keyboard.press('ArrowRight');
    const active = await page.evaluate(() => document.activeElement.dataset.tab);
    const activePanel = await page.evaluate(() => document.querySelector('.cat-panel.active').dataset.panel);
    assert.equal(active, 'selection');
    assert.equal(activePanel, 'selection');
  });

  console.log('Theme switcher');
  for (const theme of Object.keys(THEME_BG)) {
    await check(`theme "${theme}" updates data-theme, theme-color meta and color-scheme`, async () => {
      await page.click(`[data-theme-btn="${theme}"]`);
      await page.waitForTimeout(300); // let the .25s background/color CSS transition settle
      const state = await page.evaluate(() => ({
        dataTheme: document.documentElement.getAttribute('data-theme'),
        metaColor: document.querySelector('meta[name="theme-color"]').content.toLowerCase(),
        scheme: getComputedStyle(document.documentElement).colorScheme,
      }));
      assert.equal(state.dataTheme, theme);
      assert.equal(state.metaColor, THEME_BG[theme]);
      assert.equal(state.scheme, THEME_SCHEME[theme]);
    });
  }

  console.log('Skip link');
  await check('first Tab focuses it; activating it focuses #main-content', async () => {
    await page.goto(indexPath); // fresh load so nothing is focused yet
    await page.keyboard.press('Tab');
    const skipClass = await page.evaluate(() => document.activeElement.className);
    assert.equal(skipClass, 'skip-link');
    await page.keyboard.press('Enter');
    const mainId = await page.evaluate(() => document.activeElement.id);
    assert.equal(mainId, 'main-content');
  });

  console.log('Mobile nav');
  await check('hamburger opens/closes the menu on a narrow viewport', async () => {
    const mobileContext = await browser.newContext({ viewport: { width: 375, height: 700 } });
    const mp = await mobileContext.newPage();
    await mp.goto(indexPath);
    const before = await mp.evaluate(() => getComputedStyle(document.getElementById('nav-links')).display);
    assert.equal(before, 'none');
    await mp.click('#nav-toggle');
    const afterOpen = await mp.evaluate(() => getComputedStyle(document.getElementById('nav-links')).display);
    assert.equal(afterOpen, 'flex');
    await mp.click('#nav-links a[href="#components"]');
    const afterLinkClick = await mp.evaluate(() => getComputedStyle(document.getElementById('nav-links')).display);
    assert.equal(afterLinkClick, 'none');
    await mobileContext.close();
  });

  console.log('Decorative content');
  await check('all 85 .comp-card previews are aria-hidden from assistive tech', async () => {
    const total = await page.$$eval('.comp-card .demo', (els) => els.length);
    const hidden = await page.$$eval('.comp-card .demo[aria-hidden="true"]', (els) => els.length);
    assert.equal(total, 85);
    assert.equal(hidden, 85);
  });

  console.log('Console cleanliness');
  await check('zero console/page errors were raised during the whole run', () => {
    assert.deepEqual(consoleErrors, []);
  });

  await browser.close();

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
}

main();
