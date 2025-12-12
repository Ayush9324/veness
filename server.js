import express from "express";
import path from "path";
import { fileURLToPath } from "url";
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

// Serve frontend files from 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// Lazy load Groq client
let client;

// Allowed models whitelist
const ALLOWED_MODELS = ["llama3-70b-8192", "llama-3.1-8b-instant", "mixtral-8x7b-32768"];

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

  // Validate model
  const model = body.model || "llama3-70b-8192";
  console.log(`Incoming request for model: ${model}`); // Log the requested model

  if (!ALLOWED_MODELS.includes(model)) {
    console.error(`❌ Blocked invalid model request: ${model}`);
    return res.status(400).json({ error: "Invalid model specified" });
  }

  try {
    const response = await client.chat.completions.create({
      model: model,
      messages: body.messages, // full conversation history
      temperature: body.temperature ?? 0.7,
      max_tokens: body.max_tokens ?? 1024,
    });

    res.json(response); // return full Groq response
  } catch (err) {
    console.error("🔥 Groq API Error:", err);
    // Security: Don't leak internal error details to client
    res.status(500).json({ error: "An error occurred while processing your request." });
  }
});

// Simple in-memory stats (reset on restart)
let totalVisits = 0;
// Simulate some past visits for "past month" feel
let pastMonthVisits = Math.floor(Math.random() * 5000) + 1000; 

app.get("/api/stats", (req, res) => {
  res.json({ 
    visits: totalVisits + pastMonthVisits,
    uptime: process.uptime()
  });
});

// Handle fallback routes - serve index.html from public
app.get("*", (req, res) => {
  if (req.path === '/' || req.path === '/index.html') {
    totalVisits++;
  }
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Use Render's PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.timeEnd("⚡ Server Startup");
  console.log(`🚀 Veness backend (Groq) is running on port ${PORT}`);
});
