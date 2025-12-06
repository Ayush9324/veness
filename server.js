import express from "express";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import http from "http";

// Measure startup time
console.time("⚡ Server Startup");

dotenv.config();

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
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "cdnjs.cloudflare.com", "cdn.jsdelivr.net"],
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

// Allow CORS only for specific origins if needed, or remove if same-origin
// For now, we'll allow same-origin by default (no CORS middleware needed for same-origin)
// If you need external access, uncomment and configure:
// app.use(cors({ origin: "https://your-frontend-domain.com" }));
app.use(express.json());

// Serve frontend files from 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// Check for API Key
if (!process.env.GROQ_API_KEY) {
  console.error("❌ Error: GROQ_API_KEY is missing in .env file.");
  console.error("👉 Please create a .env file and add: GROQ_API_KEY=your_api_key_here");
  process.exit(1);
}

// GROQ client
const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Allowed models whitelist
const ALLOWED_MODELS = ["llama3-70b-8192", "llama-3.1-8b-instant", "mixtral-8x7b-32768"];

// API: chat with conversation memory
app.post("/api/chat", async (req, res) => {
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

// Handle fallback routes - serve index.html from public
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Use Render's PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.timeEnd("⚡ Server Startup");
  console.log(`🚀 Veness backend (Groq) is running on port ${PORT}`);
});
