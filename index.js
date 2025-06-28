const express = require("express");
const cors = require("cors");
const playwright = require("playwright");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/scrape", async (req, res) => {
  const { query = "" } = req.body;

  if (!query.trim()) {
    return res.status(400).json({ error: "Missing query" });
  }

  try {
    const browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Spoof user agent and viewport size
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/120.0.0.0 Safari/537.36"
    );
    await page.setViewportSize({ width: 1280, height: 800 });

    const url = `https://www.fiverr.com/search/gigs?query=${encodeURIComponent(
      query
    )}`;

    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });

    // Debug screenshot (optional, remove in production)
    await page.screenshot({ path: "debug.png", fullPage: true });

    // Wait for updated gig cards selector
    await page.waitForSelector(
      'div[data-test="gig-card"], a[data-test="gig-card-tiles"]',
      { timeout: 30000 }
    );

    // Extract gigs with updated selectors
    const gigs = await page.$$eval(
      'div[data-test="gig-card"], a[data-test="gig-card-tiles"]',
      (nodes) =>
        nodes.map((node) => {
          const title = node.querySelector("h3")?.textContent?.trim() || "";
          const price =
            node
              .querySelector("[data-test='gig-price']")
              ?.textContent?.trim() || "";
          const seller =
            node
              .querySelector("[data-test='seller-name']")
              ?.textContent?.trim() || "";
          const url = node.querySelector("a")?.getAttribute("href") || "";

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
    res.status(500).json({ error: "Scraping failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Scraper listening on port ${PORT}`));
