import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { readFile } from "fs/promises";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";

// Measure startup time
console.time("⚡ Server Startup");

// Lazy load dotenv only in development
if (process.env.NODE_ENV !== 'production') {
  const { default: dotenv } = await import("dotenv");
  dotenv.config();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Optimization: Compress responses for faster load times
app.use(compression());

// Security: Set various HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "cdn.tailwindcss.com",
          "cdn.jsdelivr.net",
          "cdnjs.cloudflare.com",
          "https://static.cloudflareinsights.com",
          "'unsafe-inline'",
          "'unsafe-eval'", // Required for Tailwind CDN
          "blob:", // Required for Tesseract/PDF.js workers
        ],
        workerSrc: ["'self'", "blob:"],
        styleSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: [
          "'self'",
          "cdnjs.cloudflare.com",
          "cdn.jsdelivr.net",
          "https://tessdata.projectnaptha.com", // Required for Tesseract language data
          "https://cloudflareinsights.com",
          "https://*.cloudflareinsights.com",
          "data:", // Required for Tesseract workers
          "blob:",
        ],
      },
    },
  })
);

// Security: Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later."
});
app.use("/api/", limiter);

app.use(express.json());

// Simple in-memory stats (reset on restart)
let totalVisits = 0;
// Simulate some past visits for "past month" feel
let pastMonthVisits = Math.floor(Math.random() * 5000) + 1000;

const cloudflareAnalyticsScript = `<script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "436f75c8edd441c8adab18ccb68267e0"}'></script>`;

async function sendPageWithAnalytics(res, next) {
  try {
    const html = await readFile(path.join(__dirname, "public", "index.html"), "utf8");
    res.type("html").send(html.replace("</head>", `  ${cloudflareAnalyticsScript}\n</head>`));
  } catch (error) {
    next(error);
  }
}

// Serve the app entry point with Cloudflare Web Analytics installed.
app.get(["/", "/index.html"], (req, res, next) => {
  totalVisits++;
  sendPageWithAnalytics(res, next);
});

// Serve frontend files from 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// Lazy load Groq client
let client;

// Keep this list updated with the current Groq free models.
// The backend will try them in order and automatically fall back if one is unavailable.
const FREE_CHAT_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "openai/gpt-oss-safeguard-20b",
  "qwen-qwq-32b-preview",
];

const DEFAULT_CHAT_MODEL = FREE_CHAT_MODELS[0];

function isModelAvailabilityError(err) {
  const message = (err?.message || "").toLowerCase();
  const serialized = JSON.stringify(err || {});

  return serialized.includes("model_not_found") ||
    serialized.includes("not have access to it") ||
    message.includes("does not exist") ||
    message.includes("model not found") ||
    message.includes("not have access");
}

// API: chat with conversation memory
app.post("/api/chat", async (req, res) => {
  // Initialize Groq client on first request (Lazy Loading)
  if (!client) {
    if (!process.env.GROQ_API_KEY) {
      console.error("❌ Error: GROQ_API_KEY is missing.");
      return res.status(500).json({ error: "Server configuration error" });
    }
    const { default: Groq } = await import("groq-sdk");
    client = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  const body = req.body;

  // Validate incoming body structure
  if (!body.messages || !Array.isArray(body.messages)) {
    return res.status(400).json({ error: "messages array is required" });
  }

  // Security: Validate message content
  const isValidConversation = body.messages.every(msg =>
    msg &&
    typeof msg.role === 'string' &&
    typeof msg.content === 'string' &&
    msg.content.length < 20000 // Limit message size
  );

  if (!isValidConversation) {
    return res.status(400).json({ error: "Invalid message format or content too long" });
  }

  const requestedModel = body.model || DEFAULT_CHAT_MODEL;
  const candidateModels = [...new Set([requestedModel, ...FREE_CHAT_MODELS])];

  console.log(`Incoming request for model: ${requestedModel}`);

  let lastError = null;
  let response = null;

  for (const model of candidateModels) {
    try {
      response = await client.chat.completions.create({
        model,
        messages: body.messages,
        temperature: body.temperature ?? 0.7,
        max_tokens: body.max_tokens ?? 1024,
      });
      if (response) {
        console.log(`✅ Using Groq model: ${model}`);
        return res.json(response);
      }
    } catch (err) {
      lastError = err;
      if (!isModelAvailabilityError(err)) {
        console.error(`🔥 Groq API Error for model ${model}:`, err);
        return res.status(500).json({ error: "An error occurred while processing your request." });
      }

      console.warn(`⚠️ Model unavailable: ${model}. Trying next fallback.`);
    }
  }

  console.error("🔥 No valid Groq model available for this account.", lastError);
  return res.status(500).json({ error: "No free Groq model is currently available for this API key." });
});

app.get("/api/stats", (req, res) => {
  res.json({
    visits: totalVisits + pastMonthVisits,
    uptime: process.uptime()
  });
});

// Handle fallback routes - serve index.html from public
app.get("*", (req, res, next) => {
  sendPageWithAnalytics(res, next);
});

// Use Render's PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.timeEnd("⚡ Server Startup");
  console.log(`🚀 Veness backend (Groq) is running on port ${PORT}`);
});
