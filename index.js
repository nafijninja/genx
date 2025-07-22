import express from "express";
import cors from "cors";
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

let browser, page;
let lastPrompt = "";

// Initialize browser (once)
async function initBrowser() {
  if (!browser) {
    console.log("🚀 Launching browser...");
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    page = await browser.newPage();
    await page.goto("https://magicstudio.com/ai-art-generator/", {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    console.log("✅ Browser ready at MagicStudio.");
  }
}

// Helper delay
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// Scroll page to load all images
async function scrollToLoad() {
  console.log("📜 Scrolling to load all images...");
  let prevHeight = 0;
  for (let i = 0; i < 5; i++) {
    const height = await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
      return document.body.scrollHeight;
    });
    if (height === prevHeight) break;
    prevHeight = height;
    await delay(1000);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}

// Scrape all images currently on page
async function scrapeImages() {
  console.log("🔍 Scraping all images...");
  const images = await page.$$eval("img", (imgs) =>
    imgs
      .map((img) => img.src)
      .filter((src) => src.startsWith("data:image") || src.startsWith("https"))
  );
  console.log(`📸 Found ${images.length} images.`);
  return images;
}

// Generate images from a new prompt
async function generateImages(prompt) {
  await initBrowser();

  console.log("🖊 Finding textarea...");
  const textareaSelector = "textarea#description";
  await page.waitForSelector(textareaSelector, { timeout: 60000 });
  await page.fill(textareaSelector, "");
  await page.type(textareaSelector, prompt);
  lastPrompt = prompt;

  console.log("🖱 Finding and clicking 'Create a Picture' button...");
  const genBtnSelector = "button:has-text('Create a Picture')";
  await page.waitForSelector(genBtnSelector, { timeout: 60000 });
  await page.click(genBtnSelector);

  console.log("⏳ Waiting for images...");
  await delay(15000); // Give time for generation
  await scrollToLoad();

  const images = await scrapeImages();
  if (!images.length) throw new Error("No images generated.");
  return images;
}

// Refresh images (without prompt)
async function refreshImages() {
  await initBrowser();

  console.log("🔄 Clicking 'Refresh' button...");
  const refreshBtn = await page.$("button:has-text('Refresh')");
  if (!refreshBtn) throw new Error("Refresh button not found.");
  await refreshBtn.click();

  console.log("⏳ Waiting for refreshed images...");
  await delay(12000);
  await scrollToLoad();

  const images = await scrapeImages();
  if (!images.length) throw new Error("No images after refresh.");
  return images;
}

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API routes
app.post("/generate", async (req, res) => {
  try {
    const prompt = req.body.prompt;
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });
    const images = await generateImages(prompt.trim());
    res.json({ prompt, images });
  } catch (err) {
    console.error("🔥 Generate error:", err);
    res.status(500).json({ error: "Image generation failed", details: err.message });
  }
});

app.get("/refresh", async (req, res) => {
  try {
    const images = await refreshImages();
    res.json({ prompt: lastPrompt, images });
  } catch (err) {
    console.error("🔥 Refresh error:", err);
    res.status(500).json({ error: "Image refresh failed", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
