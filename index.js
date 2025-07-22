import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import FormData from "form-data";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

// Serve the public folder for frontend
app.use(express.static(path.join(__dirname, "public")));

app.post("/generate", async (req, res) => {
  const prompt = req.body.prompt;

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    console.log("❌ Missing or invalid prompt");
    return res.status(400).json({ error: "Missing or invalid prompt" });
  }

  console.log(`🔍 Received prompt: "${prompt}"`);

  try {
    console.log("🛠️ Building form data for API...");
    const form = new FormData();
    form.append("prompt", prompt.trim());

    console.log("🚀 Sending request to MagicStudio API...");
    const response = await fetch("https://ai-api.magicstudio.com/api/ai-art-generator", {
      method: "POST",
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Referer": "https://magicstudio.com/ai-art-generator/",
        "User-Agent": "Mozilla/5.0 (compatible; Node.js backend)"
      },
      body: form,
    });

    if (!response.ok) {
      console.log(`❌ API failed: ${response.status}`);
      throw new Error(`MagicStudio API error: ${response.status}`);
    }

    const buffer = await response.buffer();
    const base64Image = `data:image/jpeg;base64,${buffer.toString("base64")}`;

    console.log("✅ Sending image back to client...");
    res.json({ prompt, image: base64Image });
  } catch (err) {
    console.error("🔥 Generation error:", err);
    res.status(500).json({ error: "Image generation failed", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
