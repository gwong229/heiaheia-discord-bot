const { chromium } = require("playwright");
const fs = require("fs");

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("https://heiaheia.com");

  console.log("Log in manually, then wait about 10 seconds...");

  // give you time to log in and load feed
  await page.waitForTimeout(30000);

  // dump page HTML
  const html = await page.content();
  fs.writeFileSync("debug_page.html", html);

  console.log("Saved DOM to debug_page.html");

  // save session no matter what
  await context.storageState({ path: "heia_session.json" });

  console.log("Session saved to heia_session.json");

  await browser.close();
})();