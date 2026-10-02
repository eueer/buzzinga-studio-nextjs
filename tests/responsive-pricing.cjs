const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3100';
const widths = [390, 809, 810, 900, 1199, 1200, 1280, 1440, 1920, 2559, 2560];

async function renderedState(page) {
  return page.evaluate(() => {
    const visible = element => element.getBoundingClientRect().width > 0;
    const cards = [...document.querySelectorAll('.framer-1p10mm2-container, .framer-wv9nzt-container')]
      .filter(visible)
      .map(element => ({
        text: element.innerText,
        left: element.getBoundingClientRect().left,
        right: element.getBoundingClientRect().right,
      }));
    const services = document.querySelector('.framer-ddpx6f');
    const style = getComputedStyle(services);
    return {
      cards,
      serviceColumns: style.display === 'grid' ? style.gridTemplateColumns.split(' ').length : 1,
      hydrated: performance.getEntriesByName('framer-hydration-commit').length > 0,
    };
  });
}

function checkState(state, width, phase) {
  const label = `${width}px ${phase}`;
  assert.equal(state.cards.length, 2, `${label}: exactly two website pricing cards`);
  assert.match(state.cards[0].text, /Streamlined build, same quality/);
  assert.match(state.cards[0].text, /₹60,000/);
  assert.match(state.cards[0].text, /Framer-only development/);
  assert.match(state.cards[1].text, /Full custom design \+ development/);
  assert.match(state.cards[1].text, /₹90,000/);
  assert.match(state.cards[1].text, /CMS integration/);
  assert.match(state.cards[1].text, /Custom micro-interactions & animations/);
  assert.equal(state.serviceColumns, width < 810 ? 1 : width < 1200 ? 2 : 4,
    `${label}: mobile/tablet/desktop service layout`);
  for (const card of state.cards) {
    assert.ok(card.left >= -1 && card.right <= width + 1, `${label}: pricing card fits viewport`);
  }
}

(async () => {
  const browser = await chromium.launch({ channel: 'chromium' });
  try {
    for (const javaScriptEnabled of [false, true]) {
      const context = await browser.newContext({ javaScriptEnabled });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {
        if (message.type() === 'error' || /recoverable error|server\/client mismatches/i.test(message.text())) {
          errors.push(message.text());
        }
      });
      const failedScripts = [];
      page.on('requestfailed', request => {
        if (request.resourceType() === 'script') failedScripts.push(request.url());
      });
      page.on('response', response => {
        if (response.request().resourceType() === 'script' && response.status() >= 400) {
          failedScripts.push(`${response.status()} ${response.url()}`);
        }
      });
      for (const width of widths) {
        await page.setViewportSize({ width, height: 1000 });
        const response = await page.goto(baseURL, { waitUntil: 'load' });
        assert.equal(response.status(), 200);
        if (javaScriptEnabled) {
          await page.waitForFunction(() => performance.getEntriesByName('framer-hydration-commit').length > 0);
          // Exercise the lazy, animated pricing section after hydration.
          await page.locator('.framer-wv9nzt-container:visible').scrollIntoViewIfNeeded();
        }
        const state = await renderedState(page);
        const phase = javaScriptEnabled ? 'hydrated' : 'SSR';
        checkState(state, width, phase);
        assert.equal(state.hydrated, javaScriptEnabled);
        if (javaScriptEnabled) assert.deepEqual(failedScripts, [], `${width}px: all hydration scripts load`);
        assert.deepEqual(errors, [], `${width}px: no browser or hydration errors`);
        console.log(`PASS ${width}px ${phase}: correct layout, ₹60,000 + ₹90,000, cards fit`);
      }
      if (javaScriptEnabled) {
        for (const width of [900, 1200, 390, 1280, 2560]) {
          await page.setViewportSize({ width, height: 1000 });
          await page.waitForFunction(width => {
            const style = getComputedStyle(document.querySelector('.framer-ddpx6f'));
            const columns = style.display === 'grid' ? style.gridTemplateColumns.split(' ').length : 1;
            return columns === (width < 810 ? 1 : width < 1200 ? 2 : 4);
          }, width);
          checkState(await renderedState(page), width, 'resized');
          console.log(`PASS ${width}px resized: layout and pricing remain correct`);
        }
        assert.deepEqual(errors, [], 'no errors during live resizing');
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
