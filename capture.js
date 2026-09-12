const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  const fileUrl = 'file:///' + path.resolve(__dirname, 'src/F4rbfieberTransformersScreen/Web/index.html').replace(/\\/g, '/');
  console.log('Loading:', fileUrl);
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });
  await new Promise(resolve => setTimeout(resolve, 3000)); // wait for animations
  if (!fs.existsSync('docs')) {
    fs.mkdirSync('docs');
  }
  await page.screenshot({ path: 'docs/transformers-screen.png' });
  await browser.close();
  console.log('Screenshot saved to docs/transformers-screen.png');
})();
