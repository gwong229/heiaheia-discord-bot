// bot.js
const { chromium } = require("playwright");
const fetch = require("node-fetch");

// --- CONFIG ---
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK; // replace with your webhook
const POLL_INTERVAL = 60 * 1000; // 60 seconds

// --- State to track seen posts ---
const seenPosts = new Set();

(async () => {
  // Launch browser headless using saved session
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: "heia_session.json",
  });
  const page = await context.newPage();

  console.log("Bot started. Navigating to feed...");

  await page.goto("https://app.heiaheia.com");

  // Wait until feed container is loaded
  await page.waitForSelector("div.r_-feed-entry.js-feed-entry");

  console.log("Feed loaded. Starting polling...");

  // Function to scrape feed entries
  async function scrapeFeed() {
    try {
      // reload feed so new posts appear
      await page.reload({ waitUntil: "domcontentloaded" });

      // wait for feed entries again
      await page.waitForSelector("div.r_-feed-entry.js-feed-entry");

      const posts = await page.$$eval(
        "div.r_-feed-entry.js-feed-entry",
        (entries) =>
          entries
            .map((entry) => {
              // detect private posts
              const isPrivate = entry.querySelector(".r_-icon_14_lock");
              if (isPrivate) return null;

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

      console.log("Posts found:", posts.length);

      for (const post of posts) {
        if (!seenPosts.has(post.id)) {
          seenPosts.add(post.id);

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
    } catch (err) {
      console.error("Error scraping feed:", err);
    }
  }

  // Initial scrape
  // First scrape only records posts so we don't repost old ones
  const initialPosts = await page.$$eval(
    "div.r_-feed-entry.js-feed-entry",
    (entries) =>
      entries
        .map((entry) => {
          const isPrivate = entry.querySelector(".r_-icon_14_lock");
          if (isPrivate) return null;
          return entry.dataset.id;
        })
        .filter(Boolean),
  );

  initialPosts.forEach((id) => seenPosts.add(id));

  console.log("Initialized with", seenPosts.size, "existing posts.");

  // start polling after initialization
  await scrapeFeed();
  await browser.close();
})();
