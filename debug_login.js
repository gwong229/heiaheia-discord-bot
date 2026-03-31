const { chromium } = require("playwright");
const fs = require("fs");

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("https://app.heiaheia.com");

  console.log("Log in fully, then press ENTER...");

  process.stdin.once("data", async () => {
    await page.goto("https://app.heiaheia.com", {
      waitUntil: "networkidle",
    });

    const html = await page.content();
    fs.writeFileSync("debug_page.html", html);

    await context.storageState({ path: "heia_session.json" });

    console.log("Session saved!");
    await browser.close();
  });
})();