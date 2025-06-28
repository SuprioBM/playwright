const express = require("express");
const cors = require("cors");
const playwright = require("playwright-core");
const chromium = require("chrome-aws-lambda");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/scrape", async (req, res) => {
  const { query = "" } = req.body;

  if (!query.trim()) {
    return res.status(400).json({ error: "Missing query" });
  }

  try {
    const browser = await chromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    await page.goto(
      `https://www.fiverr.com/search/gigs?query=${encodeURIComponent(query)}`,
      { waitUntil: "networkidle" }
    );

    await page.waitForSelector(".gig-card-layout", { timeout: 15000 });

    const gigs = await page.$$eval(".gig-card-layout", (nodes) =>
      nodes.map((node) => {
        const title = node.querySelector("h3")?.textContent?.trim() || "";
        const price =
          node.querySelector(".gig-price")?.textContent?.trim() || "";
        const seller =
          node.querySelector(".seller-name")?.textContent?.trim() || "";
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
