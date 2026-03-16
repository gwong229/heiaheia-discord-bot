const fs = require("fs");
const { chromium } = require("playwright");
const fetch = require("node-fetch");

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK;
const POLL_INTERVAL = 60 * 1000;
const SEEN_FILE = "seen_posts.json";

// Load previously seen posts
let seenPosts = new Set();
if (fs.existsSync(SEEN_FILE)) {
  const data = fs.readFileSync(SEEN_FILE, "utf-8");
  seenPosts = new Set(JSON.parse(data));
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: "heia_session.json",
  });
  const page = await context.newPage();

  console.log("Bot started. Navigating to feed...");
  await page.goto("https://app.heiaheia.com");
  await page.waitForSelector("div.r_-feed-entry.js-feed-entry");

  console.log("Feed loaded.");

  async function scrapeFeed() {
    try {
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForSelector("div.r_-feed-entry.js-feed-entry");

      const posts = await page.$$eval(
        "div.r_-feed-entry.js-feed-entry",
        (entries) =>
          entries
            .map((entry) => {
              if (entry.querySelector(".r_-icon_14_lock")) return null;
              const id = entry.dataset.id;
              const titleElem = entry.querySelector(".r_-feed-entry__name");
              const metaElem = entry.querySelector(".r_-feed-entry__meta");
              const title = titleElem
                ? titleElem.textContent.trim()
                : "No title";
              const meta = metaElem
                ? metaElem.textContent.trim().replace(/\s+/g, " ")
                : "";
              return { id, title, meta };
            })
            .filter(Boolean),
      );

      let newPosts = false;

      for (const post of posts) {
        if (!seenPosts.has(post.id)) {
          seenPosts.add(post.id);
          newPosts = true;

          console.log("New post:", post.title, "-", post.meta);

          await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: `${post.title} - ${post.meta}`,
            }),
          });
        }
      }

      // Save once if there were any new posts
      if (newPosts) {
        fs.writeFileSync("seen_posts.json", JSON.stringify([...seenPosts]));
      }

      // Save updated seen posts
      fs.writeFileSync(SEEN_FILE, JSON.stringify([...seenPosts]), "utf-8");
    } catch (err) {
      console.error("Error scraping feed:", err);
    }
  }

  await scrapeFeed(); // run once on startup
  await browser.close();
})();
