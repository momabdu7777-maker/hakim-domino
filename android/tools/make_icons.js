// يرسم أيقونات التطبيق (حجر دومينو عاجي على جوخ أخضر) ثم يحجّمها لكل كثافة شاشة.
// الاستخدام: PLAYWRIGHT_CORE=/path/to/playwright-core node tools/make_icons.js
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');

const ROOT = path.resolve(__dirname, '..');

// حجر ٦|٣ مرسوم في مساحة 200×400
const pip = (x, y) => `<circle cx="${x}" cy="${y}" r="21" fill="url(#pip)"/>`;
const six = [[58, 52], [58, 100], [58, 148], [142, 52], [142, 100], [142, 148]].map(([x, y]) => pip(x, y)).join('');
const three = [[52, 252], [100, 300], [148, 348]].map(([x, y]) => pip(x, y)).join('');
const tile = `
  <rect x="0" y="14" width="200" height="400" rx="30" fill="#8f7a52"/>
  <rect x="0" y="0" width="200" height="400" rx="30" fill="url(#face)"/>
  <rect x="3" y="3" width="194" height="394" rx="27" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="3"/>
  <rect x="26" y="197" width="148" height="6" rx="3" fill="#6b532a" opacity=".45"/>
  ${six}${three}
  <circle cx="100" cy="200" r="11" fill="url(#pin)"/>`;
const defs = `<defs>
  <radialGradient id="bgG" cx="50%" cy="42%" r="72%"><stop offset="0" stop-color="#2a9466"/><stop offset=".55" stop-color="#0f5236"/><stop offset="1" stop-color="#062519"/></radialGradient>
  <radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#f2c14e" stop-opacity=".55"/><stop offset="1" stop-color="#f2c14e" stop-opacity="0"/></radialGradient>
  <linearGradient id="face" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffef8"/><stop offset="1" stop-color="#e6d7b4"/></linearGradient>
  <radialGradient id="pip" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#4a4038"/><stop offset=".6" stop-color="#17130e"/><stop offset="1" stop-color="#000"/></radialGradient>
  <radialGradient id="pin" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#fff4c8"/><stop offset=".55" stop-color="#d6a23a"/><stop offset="1" stop-color="#6d4a10"/></radialGradient>
  <filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="18" stdDeviation="18" flood-opacity=".45"/></filter>
</defs>`;
// scale: ارتفاع الحجر = 400 × scale داخل لوحة 1024
const place = scale => `<circle cx="512" cy="512" r="${330 * scale / 1.6}" fill="url(#glow)"/>
  <g filter="url(#sh)" transform="translate(512 512) rotate(-18) scale(${scale}) translate(-100 -200)">${tile}</g>`;
const svgs = {
  legacy: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${defs}<rect width="1024" height="1024" rx="230" fill="url(#bgG)"/>${place(1.75)}</svg>`,
  round:  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${defs}<circle cx="512" cy="512" r="512" fill="url(#bgG)"/>${place(1.65)}</svg>`,
  // واجهة الأيقونة التكيفية: قطر الحجر المائل يبقى داخل الدائرة الآمنة (٦٦ من ١٠٨)
  fg:     `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${defs}${place(1.3)}</svg>`,
  store:  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${defs}<rect width="1024" height="1024" fill="url(#bgG)"/>${place(1.75)}</svg>`
};

(async () => {
  const out = path.join(ROOT, 'tools', 'masters');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } });
  for (const [name, svg] of Object.entries(svgs)) {
    await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', '<svg width="1024" height="1024" ')}</body></html>`);
    await page.screenshot({ path: path.join(out, name + '.png'), omitBackground: true });
  }
  await browser.close();
  execFileSync('python3', ['-I', path.join(__dirname, 'resize_icons.py'), out, path.join(ROOT, 'res')], { stdio: 'inherit' });
})();
