const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3100';
const widths = [375, 390, 430, 809, 810, 900, 1199, 1200, 1280, 1440, 1920, 2559, 2560];
const sectionLinks = { 'About Us': 'about-us', Pricing: 'pricing', Team: 'team', FAQs: 'faqs' };
const socialLinks = {
  Instagram: 'https://www.instagram.com/buzzinga.studio/',
  LinkedIn: 'https://www.linkedin.com/in/vannshagrawal/',
};

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
      navName: [...document.querySelectorAll('nav')].find(visible)?.dataset.framerName,
      footerLinks: [...document.querySelectorAll('a.framer-styles-preset-pbndum')]
        .filter(visible).map(a => ({ text: a.innerText.trim(), href: a.href, target: a.target })),
      process: ['.framer-vz487l', '.framer-1b3tbs1', '.framer-1rpqj5p', '.framer-1wbcksd', '.framer-1ifl8pu']
        .map(selector => [...document.querySelectorAll(selector)].find(visible))
        .map(element => {
          const rect = element.getBoundingClientRect();
          return { left: rect.left, right: rect.right, padding: getComputedStyle(element).paddingLeft };
        }),
      documentWidth: document.documentElement.scrollWidth,
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
  assert.equal(state.navName, width < 1200 ? 'Mobile Closed' : 'Desktop', `${label}: navigation variant`);
  for (const [text, id] of Object.entries(sectionLinks)) {
    const links = state.footerLinks.filter(link => link.text === text);
    assert.equal(links.length, 1, `${label}: one visible footer ${text} link`);
    const url = new URL(links[0].href);
    assert.equal(url.hash, `#${id}`);
    assert.equal(url.origin, new URL(baseURL).origin);
    assert.equal(url.pathname, new URL(baseURL).pathname);
    assert.ok(!links[0].target || links[0].target === '_self', `${label}: footer section link stays in tab`);
  }
  for (const [text, href] of Object.entries(socialLinks)) {
    const link = state.footerLinks.find(link => link.text === text);
    assert.equal(link?.href, href, `${label}: correct ${text} destination`);
    assert.equal(link.target, '_blank', `${label}: social link opens externally`);
  }
  if (width < 810) {
    for (const [index, rect] of state.process.entries()) {
      assert.ok(Math.abs(rect.left - 32) < 1, `${label}: process item ${index} left gutter is 32px`);
      assert.ok(Math.abs(width - rect.right - 32) < 1, `${label}: process item ${index} right gutter is 32px`);
      if (index > 0) assert.equal(rect.padding, '24px', `${label}: card padding preserved`);
    }
    assert.ok(state.documentWidth <= width + 1, `${label}: no horizontal page overflow`);
  }
}

async function checkMenu(page, width) {
  if (width >= 1200) return;
  const nav = page.locator('nav:visible');
  await nav.locator('[data-framer-name="Hamburger icon"]').click();
  await page.waitForFunction(() => document.querySelector('nav[data-framer-name="Mobile Expanded"]'));
  for (const text of Object.keys(sectionLinks)) await nav.getByRole('link', { name: text, exact: true }).waitFor();
  await nav.locator('[data-framer-name="Hamburger icon"]').click();
  await page.waitForFunction(() => document.querySelector('nav[data-framer-name="Mobile Closed"]'));
  await page.locator('.framer-uuydnt').scrollIntoViewIfNeeded();
  assert.equal((await renderedState(page)).navName, 'Mobile Closed', `${width}px: scrolling preserves compact menu`);
}

async function checkFooterClicks(page, context, javaScriptEnabled) {
  const initialURL = new URL(page.url());
  for (const [text, id] of Object.entries(sectionLinks)) {
    const link = page.locator('a.framer-styles-preset-pbndum:visible').filter({ hasText: new RegExp(`^${text}$`) });
    await link.click();
    await page.waitForFunction(id => {
      const rect = document.getElementById(id).getBoundingClientRect();
      return rect.top >= -2 && rect.top < 200;
    }, id);
    assert.equal(context.pages().length, 1, `${text}: no new tab`);
    const url = new URL(page.url());
    assert.equal(url.origin, initialURL.origin);
    assert.equal(url.pathname, initialURL.pathname);
    if (!javaScriptEnabled) assert.equal(url.hash, `#${id}`);
  }
}

(async () => {
  const browser = await chromium.launch({ channel: 'chromium' });
  try {
    for (const javaScriptEnabled of [false, true]) {
      const context = await browser.newContext({ javaScriptEnabled });
      if (javaScriptEnabled) {
        // Capture the visible variant throughout parsing and hydration, not just at the final snapshot.
        await context.addInitScript(() => {
          window.__navigationVariants = [];
          new MutationObserver(() => {
            const nav = [...document.querySelectorAll('nav')].find(n => n.getBoundingClientRect().width > 0);
            const name = nav?.dataset.framerName;
            if (name && window.__navigationVariants.at(-1) !== name) window.__navigationVariants.push(name);
          }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'data-framer-name'] });
        });
      }
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
          assert.equal((await renderedState(page)).navName, width < 1200 ? 'Mobile Closed' : 'Desktop');
          if (width < 1200) {
            // The reported regression happens about one second after the initial render.
            await page.waitForTimeout(5000);
            const history = await page.evaluate(() => window.__navigationVariants);
            assert.ok(history.length > 0);
            assert.ok(history.every(name => name === 'Mobile Closed'), `${width}px: no desktop flash during hydration: ${history}`);
          }
          await checkMenu(page, width);
          // Exercise the lazy, animated pricing section after hydration.
          await page.locator('.framer-wv9nzt-container:visible').scrollIntoViewIfNeeded();
        }
        const state = await renderedState(page);
        const phase = javaScriptEnabled ? 'hydrated' : 'SSR';
        checkState(state, width, phase);
        assert.equal(state.hydrated, javaScriptEnabled);
        if (javaScriptEnabled) assert.deepEqual(failedScripts, [], `${width}px: all hydration scripts load`);
        assert.deepEqual(errors, [], `${width}px: no browser or hydration errors`);
        if ([390, 430, 900, 1280].includes(width)) await checkFooterClicks(page, context, javaScriptEnabled);
        assert.deepEqual(errors, [], `${width}px: no errors after menu and footer interactions`);
        console.log(`PASS ${width}px ${phase}: pricing, navigation, footer links, and spacing`);
      }
      if (javaScriptEnabled) {
        for (const width of [900, 1200, 390, 1280, 2560]) {
          await page.setViewportSize({ width, height: 1000 });
          await page.waitForFunction(width => {
            const style = getComputedStyle(document.querySelector('.framer-ddpx6f'));
            const columns = style.display === 'grid' ? style.gridTemplateColumns.split(' ').length : 1;
            return columns === (width < 810 ? 1 : width < 1200 ? 2 : 4);
          }, width);
          await page.waitForFunction(width => {
            const nav = [...document.querySelectorAll('nav')].find(n => n.getBoundingClientRect().width > 0);
            return nav?.dataset.framerName === (width < 1200 ? 'Mobile Closed' : 'Desktop');
          }, width);
          // Let the existing spring transition settle before starting the next resize.
          await page.waitForTimeout(500);
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
