const fs = require("fs");
const { chromium } = require("playwright");
const fetch = require("node-fetch");

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK;
const SEEN_FILE = "seen_posts.json";
let lastErrorTime = 0;

async function notify(message) {
  const now = Date.now();

  // only send once every 30 minutes
  if (now - lastErrorTime < 30 * 60 * 1000) return;

  lastErrorTime = now;

  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    });
  } catch (e) {
    console.log("Fix your bot dump ass:", e.message);
  }
}

// Get the session from the secret
const encodedSession = process.env.HEIA_SESSION;
if (!encodedSession) throw new Error("HEIA_SESSION secret not set!");

// Decode and write to a temporary file
const sessionJson = Buffer.from(encodedSession, "base64").toString("utf8");
fs.writeFileSync("tmp_session.json", sessionJson);

// Load previously seen posts
let seenPosts = new Set();
if (fs.existsSync(SEEN_FILE)) {
  const data = fs.readFileSync(SEEN_FILE, "utf-8");
  seenPosts = new Set(JSON.parse(data));
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: "tmp_session.json",
  });
  const page = await context.newPage();

  console.log("Bot started. Navigating to feed...");
  await page.goto("https://app.heiaheia.com");

  if (page.url().includes("login")) {
    console.log("Session expired");

    await notify("⚠️ HeiaHeia bot: session expired (logged out)");

    await browser.close();
    return;
  }

  console.log("Current URL:", page.url());
  const found = await page
    .waitForSelector("div.r_-feed-entry.js-feed-entry", { timeout: 30000 })
    .then(() => true)
    .catch(() => false);

  if (!found) {
    await notify(
      "⚠️ HeiaHeia bot: feed not found (possible login issue or site change)",
    );
    await browser.close();
    return;
  }
  console.log("Feed loaded.");

  async function scrapeFeed() {
    try {
      await page.reload({ waitUntil: "domcontentloaded" });
      if (page.url().includes("login")) {
        await notify("Bot Expired during reload dump ass");
        return;
      }
      const found = await page
        .waitForSelector("div.r_-feed-entry.js-feed-entry", { timeout: 30000 })
        .then(() => true)
        .catch(() => false);

      if (!found) {
        if (page.url().includes("login")) {
          await notify("⚠️ HeiaHeia bot: session expired during scrape");
        } else {
          await notify("⚠️ HeiaHeia bot: feed selector missing during scrape");
        }
        return;
      }

      const posts = await page.$$eval(
        "div.r_-feed-entry.js-feed-entry",
        (entries) =>
          entries
            .map((entry) => {
              if (entry.querySelector(".r_-icon_14_lock")) return null;
              const id = entry.dataset.id || entry.getAttribute("data-id");
              if (!id) return null;
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

          // Only post to Discord if this is NOT the first run
          if (fs.existsSync(SEEN_FILE)) {
            console.log("New post:", post.title, "-", post.meta);
            await fetch(WEBHOOK_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content: `${post.title} - ${post.meta}` }),
            });
          }
        }
      }

      // Always save updated seen posts
      fs.writeFileSync(SEEN_FILE, JSON.stringify([...seenPosts]), "utf-8");
    } catch (err) {
      console.error("Error scraping feed:", err);
      await notify(`❌ HeiaHeia bot error: ${err.message}`);
    }
  }

  await scrapeFeed(); // run once
  await browser.close();
})();
