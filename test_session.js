const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    storageState: "heia_session.json"
  });
  const page = await context.newPage();

  await page.goto("https://app.heiaheia.com");

  await page.waitForTimeout(5000);

  console.log("You should be logged in now!");

  await browser.close();
})();