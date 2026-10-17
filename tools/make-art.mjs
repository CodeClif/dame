// Renders icons and the WhatsApp / social share card from tools/art.html.
//   python3 -m http.server 8080 &  then  node tools/make-art.mjs
import { chromium } from 'playwright';
const base = process.env.BASE || 'http://localhost:8080';
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: 1300, height: 2000 } });
await page.goto(`${base}/tools/art.html`);
await page.waitForSelector('body[data-ready="1"]');
await page.waitForTimeout(500);
await page.locator('#og').screenshot({ path: 'og.jpg', type: 'jpeg', quality: 82 });
for (const [sel, name, size] of [['#icon', 'icon-512.png', 512], ['#icon', 'icon-192.png', 192], ['#icon', 'apple-touch-icon.png', 180], ['#mask', 'icon-maskable-512.png', 512]]) {
  const buf = await page.locator(sel).screenshot({ type: 'png' });
  const sized = await browser.newPage({ viewport: { width: size, height: size } });
  await sized.setContent(`<body style="margin:0"><img src="data:image/png;base64,${buf.toString('base64')}" style="width:${size}px;height:${size}px;display:block">`);
  await sized.screenshot({ path: `icons/${name}`, type: 'png' });
  await sized.close();
}
await browser.close();
console.log('wrote og.jpg and icons/*.png');
