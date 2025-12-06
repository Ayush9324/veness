# Veness - AI Assistant

A beautiful, modern AI chat interface powered by Groq API. Fast talks. Fast thoughts.

![Veness](https://img.shields.io/badge/Veness-emerald?style=for-the-badge)

## Features

- 🤖 **AI-Powered Chat** - Powered by Groq's fast LLM API
- 🧠 **Conversation Memory** - AI remembers your conversation history for context
- 🎨 **Beautiful UI** - Modern glassmorphism design with smooth animations
- ⚡ **Fast Responses** - Leveraging Groq's high-speed inference
- 📱 **Responsive** - Works seamlessly on desktop and mobile devices

## Getting Started

### Prerequisites

- A Groq API key (Get one free at [console.groq.com](https://console.groq.com/keys))
- Node.js 18+ (for backend server)
- A modern web browser

### Architecture

This project uses a **backend proxy** to keep your API key secure:
- **Backend** (`server.js`) - Handles API calls with your secret key
- **Frontend** (`index.html`, `script.js`) - Calls your backend proxy

This way, your API key never appears in the frontend code!

### Installation

1. **Clone or download this repository**
   ```bash
   git clone <your-repo-url>
   cd "New folder"
   ```

2. **Set Up Backend Server**
   ```bash
   # Install dependencies
   npm install
   
   # Create .env file
   cp env.example .env
   ```
   
   Edit `.env` and add your Groq API key:
   ```
   GROQ_API_KEY=gsk_your_actual_key_here
   PORT=3000
   ```

3. **Start the Backend Server**
   ```bash
   npm start
   ```
   
   The server will run on `http://localhost:3000`

4. **Configure Frontend**
   - Open `script.js`
   - Make sure `BACKEND_URL = 'http://localhost:3000'` (already set for local dev)

5. **Open `index.html` in your browser**
   - Simply double-click the file, or
   - Use a local server (recommended):
     ```bash
     # Using Python
     python -m http.server 8000
     
     # Using Node.js (http-server)
     npx http-server
     
     # Using PHP
     php -S localhost:8000
     ```
   - Then visit `http://localhost:8000` in your browser

6. **Start chatting!**
   - The AI remembers your conversation history
   - Ask follow-up questions and it will maintain context

### Quick Start

For a faster setup, see `QUICKSTART.md`

### Deploy Backend

**For Vercel (Recommended):**
- See `VERCEL_DEPLOYMENT.md` for step-by-step Vercel deployment guide

**For Render.com:**
- See `RENDER_DEPLOYMENT.md` for step-by-step Render deployment guide

**For Other Platforms:**
- See `DEPLOYMENT.md` for Railway and Fly.io instructions

After deploying, update `BACKEND_URL` in `script.js` to your deployed URL.

## Deployment to GitHub Pages

### Method 1: Using GitHub Web Interface

1. **Create a new repository on GitHub**
   - Go to [github.com](https://github.com) and create a new repository
   - Name it whatever you like (e.g., `chat-jhat-pat`)

2. **Upload your files**
   - Click "uploading an existing file"
   - Drag and drop all your files (`index.html`, `script.js`, `styles.css`)
   - Commit the changes

3. **Enable GitHub Pages**
   - Go to your repository Settings
   - Scroll down to "Pages" section
   - Under "Source", select "Deploy from a branch"
   - Choose `main` (or `master`) branch and `/ (root)` folder
   - Click "Save"
   - Your site will be live at `https://<your-username>.github.io/<repo-name>/`

### Method 2: Using Git Command Line

```bash
# Initialize git repository
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Veness"

# Add your GitHub repository as remote
git remote add origin https://github.com/<your-username>/<repo-name>.git

# Push to GitHub
git branch -M main
git push -u origin main
```

Then enable GitHub Pages in repository settings as described in Method 1.

## API Key Security

✅ **Secure Setup**: Your API key is stored in the backend server's environment variables:
- ✅ API key never appears in frontend code
- ✅ Safe to deploy frontend to GitHub Pages
- ✅ Backend handles all API calls securely
- ✅ Environment variables are not committed to Git

**Best Practice**: 
- Keep your `.env` file local and never commit it
- Use environment variables in your deployment platform
- Frontend can be safely shared/deployed publicly

## Conversation Memory

The AI now remembers your conversation! It maintains context across messages:
- ✅ Remembers previous messages in the conversation
- ✅ Can answer follow-up questions
- ✅ Maintains context for up to 20 messages (to avoid token limits)
- ✅ Automatically manages conversation history

## Customization

### Change the AI Model

In `script.js`, you can change the model in the `callChatApi` function:

```javascript
model: 'llama-3.1-8b-instant', // Change this line
```

Available Groq models:
- `llama-3.1-8b-instant` (default - fast and efficient)
- `mixtral-8x7b-32768` (larger context window)
- `gemma-7b-it` (Google's Gemma model)
- `llama-3.3-70b-versatile` (if available - check Groq docs for latest)

### Adjust Temperature

In `script.js`, modify the temperature value (0.0 to 2.0):

```javascript
temperature: 0.7, // Lower = more focused, Higher = more creative
```

## File Structure

```
.
├── index.html      # Main HTML file
├── script.js       # JavaScript logic and Groq API integration
├── styles.css      # Custom styles and animations
├── .gitignore      # Git ignore file
└── README.md       # This file
```

## Technologies Used

- **HTML5** - Structure
- **CSS3** - Styling with glassmorphism effects
- **JavaScript (ES6+)** - Interactivity and API integration
- **Tailwind CSS** - Utility-first CSS framework (via CDN)
- **Groq API** - Fast AI inference

## License

This project is open source and available under the MIT License.

## Support

If you encounter any issues:
1. Check that your Groq API key is valid
2. Ensure you have an active internet connection
3. Check browser console for error messages
4. Verify that CORS is not blocking the API calls (should work fine with Groq)

## Credits

Built with ❤️ by Ayush

---

**Note**: This is a frontend-only application. All API calls are made directly from the browser to Groq's API. No backend server is required.

