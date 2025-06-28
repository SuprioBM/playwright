const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const playwright = require("playwright");

const app = express();
app.use(cors());
app.use(express.json());

const SCREENSHOT_PATH = "/app/debug.png"; // absolute path inside Render container

app.post("/scrape", async (req, res) => {
  const { query = "" } = req.body;

  if (!query.trim()) {
    return res.status(400).json({ error: "Missing query" });
  }

  try {
    const browser = await playwright.chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    const url = `https://www.fiverr.com/search/gigs?query=${encodeURIComponent(
      query
    )}`;

    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });

    // Take screenshot for debugging
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });

    await page.waitForSelector('div[data-test="gig-card"]', { timeout: 30000 });

    const gigs = await page.$$eval('div[data-test="gig-card"]', (nodes) =>
      nodes.map((node) => {
        const title = node.querySelector("h3")?.textContent?.trim() || "";
        const price =
          node.querySelector("[data-test='gig-price']")?.textContent?.trim() ||
          "";
        const seller =
          node
            .querySelector("[data-test='seller-name']")
            ?.textContent?.trim() || "";
        const anchor = node.querySelector("a[href]");
        const url = anchor?.getAttribute("href") || "";

        return {
          title,
          price,
          seller,
          url: url ? "https://www.fiverr.com" + url : "",
        };
      })
    );

    await browser.close();
    res.json({ gigs });
  } catch (err) {
    console.error("Scraping error:", err);
    res.status(500).json({ error: "Scraping failed", details: err.message });
  }
});

// 🖼 Serve the screenshot for debugging
app.get("/screenshot", (req, res) => {
  if (fs.existsSync(SCREENSHOT_PATH)) {
    res.sendFile(SCREENSHOT_PATH);
  } else {
    res.status(404).send("Screenshot not found.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Scraper listening on port ${PORT}`));
