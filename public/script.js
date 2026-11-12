
// ========== CONFIGURATION ==========
// Backend proxy URL - Update this with your deployed backend URL
// For local development: 'http://localhost:3000'
// For production: 'https://your-backend-url.vercel.app' or your deployed URL
const BACKEND_URL = ""; // Relative URL for same-origin

// ========== DOM Elements ==========
const chatArea = document.getElementById('chatArea');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const attachBtn = document.getElementById('attachBtn');
const micBtn = document.getElementById('micBtn');
const settingsBtn = document.getElementById('settingsBtn');
const chatHeader = document.getElementById('chatHeader');
const inputBar = document.getElementById('inputBar');
const leftIcons = document.getElementById('leftIcons');
const rightIcons = document.getElementById('rightIcons');
const fullscreenToggleBtn = document.getElementById('fullscreenToggleBtn');
const fullscreenModal = document.getElementById('fullscreenModal');
const fullscreenInput = document.getElementById('fullscreenInput');
const closeFullscreenBtn = document.getElementById('closeFullscreenBtn');
const saveFullscreenBtn = document.getElementById('saveFullscreenBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const downloadBtn = document.getElementById('downloadBtn');

// Hidden Stats Elements
const appLogo = document.getElementById('appLogo');
const statsModal = document.getElementById('statsModal');
const closeStatsBtn = document.getElementById('closeStatsBtn');
const visitorCount = document.getElementById('visitorCount');
const closeImageBtn = document.getElementById('closeImageBtn');

// File Upload Elements
const fileInput = document.getElementById('fileInput');
const filePreview = document.getElementById('filePreview');
const fileNameSpan = document.getElementById('fileName');
const removeFileBtn = document.getElementById('removeFileBtn');
let currentFileContent = null;
let currentFileName = null;
let currentFileImage = null;

// ========== SCROLL BEHAVIOR ==========
let lastScrollTop = 0;
let currentMarginTop = 0;
let headerSnapTimer = null;

chatArea.addEventListener('scroll', () => {
  const scrollTop = chatArea.scrollTop;
  const headerHeight = chatHeader.offsetHeight;
  
  // Clear any pending snap
  if (headerSnapTimer) clearTimeout(headerSnapTimer);
  
  // Ensure instant movement during scroll
  chatHeader.style.transition = 'none';

  // Calculate scroll delta
  const delta = scrollTop - lastScrollTop;
  
  // Update margin top based on delta
  // If scrolling down (delta > 0), margin decreases (becomes more negative)
  // If scrolling up (delta < 0), margin increases (becomes closer to 0)
  currentMarginTop = currentMarginTop - delta;
  
  // Clamp the margin
  // Cannot be less than -headerHeight (fully hidden)
  // Cannot be more than 0 (fully visible)
  if (currentMarginTop < -headerHeight) {
    currentMarginTop = -headerHeight;
  } else if (currentMarginTop > 0) {
    currentMarginTop = 0;
  }
  
  // Apply the margin
  chatHeader.style.marginTop = `${currentMarginTop}px`;
  
  // Special case: If at the very top, always show header
  if (scrollTop <= 0) {
    currentMarginTop = 0;
    chatHeader.style.marginTop = '0px';
  } else {
    // Snap logic: If scrolling stops and header is partially visible, hide it (go up)
    headerSnapTimer = setTimeout(() => {
      if (currentMarginTop < 0 && currentMarginTop > -headerHeight) {
        chatHeader.style.transition = 'margin-top 0.3s ease-out';
        currentMarginTop = -headerHeight; // Snap to hidden
        chatHeader.style.marginTop = `${currentMarginTop}px`;
      }
    }, 150);
  }
  
  lastScrollTop = scrollTop;
});

// ========== CONVERSATION MEMORY ==========
// Store conversation history for context
let conversationHistory = [];

// Helper: Get current time
function getCurrentTime() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minutesStr} ${ampm}`;
}

// ========== MARKDOWN CONFIGURATION ==========
// Configure Marked.js with Highlight.js and custom renderer
marked.setOptions({
  breaks: true, // Enable line breaks
  gfm: true     // Enable GitHub Flavored Markdown
});

const renderer = new marked.Renderer();

// Custom code block renderer with Copy button
renderer.code = function({ text, lang }) {
  // Handle both old (code, lang) and new ({text, lang}) signatures
  const code = text || arguments[0];
  const language = lang || arguments[1];

  // Ensure code is a string
  const safeCode = (typeof code === 'string') ? code : String(code || '');
  const safeLang = (typeof language === 'string') ? language : 'text';

  const validLang = !!(safeLang && hljs.getLanguage(safeLang));
  const highlighted = validLang 
    ? hljs.highlight(safeCode, { language: safeLang }).value 
    : hljs.highlightAuto(safeCode).value;
  
  return `
    <div class="code-block-wrapper">
      <div class="code-header">
        <span class="code-lang">${safeLang}</span>
        <button class="copy-btn">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
          </svg>
          Copy
        </button>
      </div>
      <pre><code class="hljs ${safeLang}">${highlighted}</code></pre>
      <div class="hidden-code" style="display:none;">${encodeURIComponent(safeCode)}</div>
    </div>
  `;
};

marked.use({ renderer });

// Event Delegation for Copy Button
document.addEventListener('click', function(e) {
  const btn = e.target.closest('.copy-btn');
  if (!btn) return;
  
  const wrapper = btn.closest('.code-block-wrapper');
  if (!wrapper) return;
  
  const hiddenCode = wrapper.querySelector('.hidden-code');
  if (!hiddenCode) return;
  
  const code = decodeURIComponent(hiddenCode.textContent);
  
  // Fallback for older browsers or non-secure contexts
  if (!navigator.clipboard) {
    const textArea = document.createElement("textarea");
    textArea.value = code;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      showCopySuccess(btn);
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
    }
    document.body.removeChild(textArea);
    return;
  }

  navigator.clipboard.writeText(code).then(() => {
    showCopySuccess(btn);
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
});

function showCopySuccess(btn) {
  const originalHtml = btn.innerHTML;
  btn.innerHTML = `
    <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
    </svg>
    <span class="text-emerald-400">Copied!</span>
  `;
  setTimeout(() => {
    btn.innerHTML = originalHtml;
  }, 2000);
}

// Text-to-Speech Logic
let currentUtterance = null;
let currentSpeakBtn = null;
let currentTextElement = null;

function toggleSpeech(text, btn, textElement) {
  const synth = window.speechSynthesis;

  // If this button is currently active (showing stop state), stop it
  if (currentSpeakBtn === btn) {
    stopSpeech();
    return;
  }

  // If speaking something else, stop it first
  stopSpeech();

  // Start speaking
  // Assign to global variable to prevent garbage collection
  currentUtterance = new SpeechSynthesisUtterance(text);
  
  currentUtterance.onboundary = (event) => {
    if (event.name === 'word' && textElement) {
      highlightWord(textElement, event.charIndex, event.charLength);
    }
  };

  currentUtterance.onend = () => {
    stopSpeech();
  };

  currentUtterance.onerror = (e) => {
    console.error('Speech error:', e);
    stopSpeech();
  };

  // Update button to "Stop" state
  btn.innerHTML = `
    <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"></path>
    </svg>
  `;
  
  currentSpeakBtn = btn;
  currentTextElement = textElement;
  synth.speak(currentUtterance);
}

function stopSpeech() {
  const synth = window.speechSynthesis;
  synth.cancel();
  
  if (currentSpeakBtn) {
    resetSpeakButton(currentSpeakBtn);
  }
  
  if (currentTextElement) {
    removeHighlight(currentTextElement);
  }
  
  currentSpeakBtn = null;
  currentUtterance = null;
  currentTextElement = null;
}

function resetSpeakButton(btn) {
  if (!btn) return;
  btn.innerHTML = `
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path>
      </svg>
  `;
}

function highlightWord(root, index, length) {
  removeHighlight(root);

  let charCount = 0;
  const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
  
  while (treeWalker.nextNode()) {
    const node = treeWalker.currentNode;
    const nodeLength = node.textContent.length;
    
    if (charCount + nodeLength > index) {
      const startInNode = index - charCount;
      const endInNode = startInNode + length;
      
      if (endInNode <= nodeLength) {
        const range = document.createRange();
        range.setStart(node, startInNode);
        range.setEnd(node, endInNode);
        
        const span = document.createElement('span');
        span.className = 'highlight-word';
        range.surroundContents(span);
      }
      break;
    }
    charCount += nodeLength;
  }
}

function removeHighlight(root) {
  const highlighted = root.querySelector('.highlight-word');
  if (highlighted) {
    const text = highlighted.textContent;
    const textNode = document.createTextNode(text);
    highlighted.parentNode.replaceChild(textNode, highlighted);
    root.normalize();
  }
}

// Helper: Typewriter effect for AI responses
async function typeWriterEffect(text, element, speed = 10) {
  let i = 0;
  const startTime = Date.now();
  const maxDuration = 1500; // 1.5 seconds

  return new Promise((resolve) => {
    function type() {
      const elapsedTime = Date.now() - startTime;

      if (i < text.length && elapsedTime < maxDuration) {
        // Type a few characters at a time for speed and "chunk" feel
        const chunkSize = Math.floor(Math.random() * 3) + 1; 
        const chunk = text.substring(i, i + chunkSize);
        i += chunkSize;
        
        const currentText = text.substring(0, i);
        
        // Parse and sanitize
        const rawHtml = marked.parse(currentText);
        const cleanHtml = DOMPurify.sanitize(rawHtml, {
          ADD_TAGS: ['pre', 'code', 'div', 'span', 'button', 'svg', 'path'],
          ADD_ATTR: ['class', 'onclick', 'viewBox', 'fill', 'stroke', 'd', 'stroke-linecap', 'stroke-linejoin', 'stroke-width', 'style']
        });
        
        element.innerHTML = cleanHtml;
        
        setTimeout(type, speed);
      } else {
        // Ensure final text is rendered correctly (either finished or timeout)
        const rawHtml = marked.parse(text);
        const cleanHtml = DOMPurify.sanitize(rawHtml, {
          ADD_TAGS: ['pre', 'code', 'div', 'span', 'button', 'svg', 'path'],
          ADD_ATTR: ['class', 'onclick', 'viewBox', 'fill', 'stroke', 'd', 'stroke-linecap', 'stroke-linejoin', 'stroke-width', 'style']
        });
        element.innerHTML = cleanHtml;
        resolve();
      }
    }
    type();
  });
}

// Helper: Add message bubble
function addMessageBubble({ text, role, autoScroll = true, showActions = true, image = null, skipRendering = false }) {
  const messageContainer = document.createElement('div');
  messageContainer.className = `flex items-start gap-3 message-animate ${role === 'user' ? 'justify-end' : ''}`;

  const messageWrapper = document.createElement('div');
  // AI messages take full width, User messages are constrained
  const widthClass = role === 'user' ? 'max-w-[85%] md:max-w-[75%] w-auto items-end' : 'w-full';
  messageWrapper.className = `${widthClass} flex flex-col`;

  const bubble = document.createElement('div');
  if (role === 'user') {
    // Changed from emerald (green) to zinc (grey) to match the theme
    bubble.className = 'bg-gradient-to-br from-zinc-700 to-zinc-900 rounded-2xl rounded-tr-sm px-4 py-3 user-message-glow break-words shadow-lg';
  } else {
    bubble.className = 'glass-dark rounded-2xl rounded-tl-sm px-5 py-4 border border-white/10 break-words shadow-xl w-full';
  }

  // Add image if present
  if (image) {
    const imgElement = document.createElement('img');
    imgElement.src = image;
    // Limit height to make it a preview, object-contain to keep aspect ratio
    imgElement.className = 'max-w-full max-h-60 w-auto rounded-lg mb-3 border border-white/10 object-contain cursor-pointer hover:opacity-90 transition-opacity';
    
    // Optional: Click to view full size (simple implementation)
    imgElement.onclick = () => openImageModal(image);
    
    bubble.appendChild(imgElement);
  }

  const textElement = document.createElement('div'); 
  textElement.className = 'text-white text-sm md:text-base break-words whitespace-pre-wrap markdown-body';
  
  if (role === 'user') {
    textElement.textContent = text; 
  } else {
    if (!skipRendering) {
      // Parse Markdown and Sanitize HTML for AI responses
      // Note: DOMPurify needs to be configured to allow the class and style attributes for highlight.js
      
      // Ensure text is a string to prevent "e.replace is not a function" error
      const safeText = (typeof text === 'string') ? text : String(text || '');

      const rawHtml = marked.parse(safeText);
      const cleanHtml = DOMPurify.sanitize(rawHtml, {
        ADD_TAGS: ['pre', 'code', 'div', 'span', 'button', 'svg', 'path'],
        ADD_ATTR: ['class', 'onclick', 'viewBox', 'fill', 'stroke', 'd', 'stroke-linecap', 'stroke-linejoin', 'stroke-width', 'style']
      });
      textElement.innerHTML = cleanHtml;
    }
  }

  bubble.appendChild(textElement);

  if (showActions) {
    // Add Text-to-Speech and Copy buttons for all messages
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'flex items-center gap-2 mt-3 pt-2 border-t border-white/5';
    
    // Speaker Button
    const speakBtn = document.createElement('button');
    speakBtn.className = 'text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5 flex items-center gap-2 text-xs';
    speakBtn.innerHTML = `
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path>
      </svg>
    `;
    speakBtn.title = "Read aloud";
    
    // Use textContent to get clean text without HTML tags
    speakBtn.addEventListener('click', () => toggleSpeech(textElement.textContent, speakBtn, textElement));
    
    // Copy Button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5 flex items-center gap-2 text-xs';
    copyBtn.innerHTML = `
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
      </svg>
    `;
    copyBtn.title = "Copy message";
    
    copyBtn.addEventListener('click', () => {
        const textToCopy = (typeof text === 'string') ? text : String(text || '');
        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalHtml = copyBtn.innerHTML;
            copyBtn.innerHTML = `
            <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            `;
            setTimeout(() => {
                copyBtn.innerHTML = originalHtml;
            }, 2000);
        }).catch(err => console.error('Failed to copy', err));
    });

    actionsDiv.appendChild(speakBtn);
    actionsDiv.appendChild(copyBtn);
    bubble.appendChild(actionsDiv);
  }

  const timestamp = document.createElement('p');
  timestamp.className = `text-xs text-gray-500 mt-1.5 ${role === 'user' ? 'mr-1' : 'ml-1'}`;
  timestamp.textContent = `${role === 'user' ? 'You' : 'Veness'} · ${getCurrentTime()}`;

  messageWrapper.appendChild(bubble);
  messageWrapper.appendChild(timestamp);
  messageContainer.appendChild(messageWrapper);

  chatArea.appendChild(messageContainer);
  
  if (autoScroll) {
    scrollToBottom();
  }

  return messageContainer;
}

// Typing indicator
let typingIndicator = null;
function showTypingIndicator() {
  if (typingIndicator) return;
  const container = document.createElement('div');
  container.className = 'flex items-start gap-3 message-animate';
  container.id = 'typingIndicator';
  const wrapper = document.createElement('div');
  wrapper.className = 'max-w-[80%] w-auto';
  const bubble = document.createElement('div');
  bubble.className = 'glass-dark rounded-2xl rounded-tl-sm px-4 py-3 border border-white/10 break-words';
  const dots = document.createElement('div');
  dots.className = 'flex items-center gap-1';
  dots.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
  bubble.appendChild(dots);
  wrapper.appendChild(bubble);
  const label = document.createElement('p');
  label.className = 'text-xs text-gray-500 mt-1.5 ml-1';
  label.textContent = 'Veness is thinking...';
  wrapper.appendChild(label);
  container.appendChild(wrapper);
  chatArea.appendChild(container);
  typingIndicator = container;
  scrollToBottom();
}
function hideTypingIndicator() {
  if (typingIndicator) {
    typingIndicator.remove();
    typingIndicator = null;
  }
}

// Auto-scroll to bottom
function scrollToBottom() {
  chatArea.scrollTop = chatArea.scrollHeight;
}

// CORS proxy functions removed - using backend proxy instead

// Groq API call with conversation memory (via backend proxy)
async function callChatApi(userMessage) {
  // Add user message to conversation history
  conversationHistory.push({
    role: 'user',
    content: userMessage
  });

  // System prompt to enforce formatting and creator info
  const systemMessage = {
    role: "system",
    content: `You are Veness, a helpful AI assistant.

FORMATTING RULES:
- Use horizontal rules (---) to separate distinct sections.
- Use bold headers (## Topic) for main points.

CREATOR CONTEXT (Ayush Vijay Vishwakarma):
You were created by Ayush Vijay Vishwakarma, a developer, designer, and problem-solver from Mumbai (born Aug 27, 2007). He is currently pursuing a B.Sc. in Computers at Prahladrai Dalmia Lions College of Commerce & Economics (was a CS topper in school).

What Ayush Does:
- Self-taught in HTML, CSS, JS, Java, C++, Unity, Blender.
- Works in Web Dev, Game Dev, Motion Graphics, Photoshop, Video Editing (Premiere/After Effects), VFX, 2D/3D Animation, AI Automation.

Major Projects:
1. Drift in Wheat: Multiplayer driving game (Three.js, JSON). Link: https://driftinwheat-1.onrender.com
2. Portfolio Website: https://ayush9324.github.io/My-web
3. Share All Website: Temporary file sharing tool. Link: https://ayush9324.github.io/Shareall
4. Come Up Friends: Unity game inspired by Getting Over It. Link: https://ayush-betethijaan.itch.io

Personality: Creative, curious, disciplined. Loves cycling, video games, football, helping people.
Origin: You exist because Ayush keeps building and experimenting. You are one of his ongoing experiments in creativity and logic.

INSTRUCTION: When asked about your creator, use the info above relevant to the question. Do not dump the entire biography unless explicitly asked.`
  };

  const messagesToSend = [systemMessage, ...conversationHistory];

  const requestBody = {
    model: 'llama-3.1-8b-instant', // Updated to currently supported model
    messages: messagesToSend, // Send entire conversation history for context
    temperature: 0.7,
    max_tokens: 1024,
  };

  try {
    // Call backend proxy instead of Groq directly
    const response = await fetch(`${BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your backend server configuration.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (response.status === 500) {
        throw new Error(errorData.error || 'Backend server error. Please check server logs.');
      } else {
        throw new Error(errorData.error || errorData.message || `API error: ${response.status}`);
      }
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
    
    // Add AI response to conversation history
    conversationHistory.push({
      role: 'assistant',
      content: aiResponse
    });
    
    // Limit conversation history to last 20 messages to avoid token limits
    if (conversationHistory.length > 20) {
      conversationHistory = conversationHistory.slice(-20);
    }
    
    return aiResponse;
  } catch (error) {
    // Log the actual error for debugging
    console.error('Groq API Error:', error);
    
    // Check for specific error types
    if (error.message.includes('API key') || error.message.includes('Rate limit')) {
      throw error;
    }
    
    // Check for network/CORS errors
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('CORS')) {
      throw new Error(`Cannot connect to backend server. Please make sure the backend is running.`);
    }
    
    // Return the actual error message if available
    if (error.message) {
      throw new Error(`API Error: ${error.message}`);
    }
    
    throw new Error(`Failed to connect to backend: ${error.message || 'Unknown error'}`);
  }
}

// Main: send message
async function sendMessage() {
  let text = messageInput.value.trim();
  let displayText = text;
  let apiText = text;
  
  // Append file content if available
  if (currentFileContent) {
    const fileContext = `\n\n[Attached File: ${currentFileName}]\n\`\`\`\n${currentFileContent}\n\`\`\`\n[End of File]`;
    
    // For UI: Just show the filename
    if (currentFileImage) {
      // If it's an image, don't show the "Attached:" text, just the user's message
      displayText = text;
    } else {
      displayText = text ? `${text}\n\n📎 **Attached:** ${currentFileName}` : `📎 **Attached:** ${currentFileName}`;
    }
    
    // For API: Send full content
    apiText = text ? text + fileContext : `I have attached a file: ${currentFileName}. Please analyze it.\n${fileContext}`;
  }

  if (apiText === '') return;
  
  const userMsgElement = addMessageBubble({ 
    text: displayText, 
    role: 'user',
    image: currentFileImage 
  });
  messageInput.value = '';
  messageInput.style.height = 'auto';
  
  // Clear file attachment
  clearFile();
  
  // Trigger input event to reset expanded mode
  messageInput.dispatchEvent(new Event('input'));

  showTypingIndicator();
  
  // Auto-align: Scroll user message to top
  // We use a timeout to ensure the DOM has updated and the padding is applied
  setTimeout(() => {
    // Add a large bottom padding to the chat area temporarily to allow scrolling to top
    // if the message is near the bottom
    const remainingSpace = chatArea.clientHeight - userMsgElement.clientHeight;
    if (remainingSpace > 0) {
       // This ensures the message can actually reach the top
       chatArea.style.paddingBottom = `${remainingSpace + 100}px`;
    }
    
    userMsgElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Reset padding after scroll (optional, or keep it until response comes)
    // Keeping it might be better for the "focus" effect
  }, 100);

  try {
    const aiResponse = await callChatApi(apiText);
    
    // Reset padding when response arrives
    chatArea.style.paddingBottom = '1.5rem'; // Reset to original py-6 (1.5rem)
    
    // Force header to show (fixes lagging header on short responses)
    currentMarginTop = 0;
    chatHeader.style.marginTop = '0px';
    
    hideTypingIndicator();
    // Don't auto-scroll to bottom for AI response to keep user message in view
    // But ensure at least the start of the AI message is visible if it's off-screen
    const aiMsgElement = addMessageBubble({ text: aiResponse, role: 'ai', autoScroll: false, skipRendering: true });
    
    // Animate the typing effect
    const textElement = aiMsgElement.querySelector('.markdown-body');
    await typeWriterEffect(aiResponse, textElement);
    
    // Check if the AI message is visible. If not (e.g. user scrolled up), don't force scroll.
    // But if we are in "auto-align" mode (user msg at top), the AI msg starts right below it.
    // So we usually don't need to do anything.
    
  } catch (error) {
    chatArea.style.paddingBottom = '1.5rem';
    
    // Force header to show
    currentMarginTop = 0;
    chatHeader.style.marginTop = '0px';

    hideTypingIndicator();
    const errorMessage = error.message || 'Sorry, I encountered an error. Please try again.';
    addMessageBubble({ text: `⚠️ ${errorMessage}`, role: 'ai' });
    console.error('API Error:', error);
    console.error('Full error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // Show helpful message for CORS errors
    if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
      console.log('%c💡 TIP: If you see CORS errors, enable "Use CORS Proxy" in Settings (⚙️ icon)', 'color: #10b981; font-size: 14px; font-weight: bold;');
    }
  }
}

// Auto-grow textarea and Expanded Mode Logic
messageInput.addEventListener('input', function() {
  this.style.height = 'auto';
  const newHeight = Math.min(this.scrollHeight, 250); 
  this.style.height = newHeight + 'px';

  // Expanded Mode Logic
  // FIX: Use character count and newline count instead of height to prevent layout flickering loops.
  // (Height-based logic caused a loop: Expand -> Width Increases -> Height Decreases -> Collapse -> Repeat)
  const lineCount = (this.value.match(/\n/g) || []).length;
  const isExpanded = this.value.length > 30 || lineCount > 1;
  
  if (isExpanded) {
    // Enter Expanded Mode
    if (!inputBar.classList.contains('expanded-input-bar')) {
      inputBar.classList.add('expanded-input-bar');
      leftIcons.style.display = 'none';
      micBtn.style.display = 'none';
    }
    
    // Show fullscreen button if height is significant
    if (newHeight >= 150) {
      fullscreenToggleBtn.classList.remove('opacity-0', 'pointer-events-none');
    }
  } else {
    // Exit Expanded Mode
    if (inputBar.classList.contains('expanded-input-bar')) {
      inputBar.classList.remove('expanded-input-bar');
      leftIcons.style.display = 'flex';
      micBtn.style.display = 'block';
    }
    fullscreenToggleBtn.classList.add('opacity-0', 'pointer-events-none');
  }
});

// Fullscreen Editor Logic
fullscreenToggleBtn.addEventListener('click', () => {
  fullscreenInput.value = messageInput.value;
  fullscreenModal.classList.remove('hidden');
  fullscreenModal.classList.add('flex');
  fullscreenInput.focus();
});

function closeFullscreen() {
  fullscreenModal.classList.add('hidden');
  fullscreenModal.classList.remove('flex');
  messageInput.focus();
}

closeFullscreenBtn.addEventListener('click', closeFullscreen);

saveFullscreenBtn.addEventListener('click', () => {
  messageInput.value = fullscreenInput.value;
  // Trigger input event to resize and update UI
  messageInput.dispatchEvent(new Event('input'));
  closeFullscreen();
});

// Download Chat Logic
downloadBtn.addEventListener('click', () => {
  if (conversationHistory.length === 0) {
    alert('No conversation to download.');
    return;
  }

  let content = "STORY OF OUR CONVERSATION\n=========================\n\n";
  conversationHistory.forEach(msg => {
    const role = msg.role === 'user' ? 'You' : 'Veness';
    content += `${role}:\n${msg.content}\n\n`;
  });
  content += "=========================\nEnd of Conversation";

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `veness-story-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// Event listeners
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
// Settings button - show settings modal
settingsBtn.addEventListener('click', () => {
  settingsModal.classList.remove('hidden');
  settingsModal.classList.add('flex');
});

closeSettingsBtn.addEventListener('click', () => {
  settingsModal.classList.add('hidden');
  settingsModal.classList.remove('flex');
});

// Close modal when clicking outside
settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) {
    settingsModal.classList.add('hidden');
    settingsModal.classList.remove('flex');
  }
});

// Helper for "Coming Soon" features
function showFeatureNotReady(featureName) {
  addMessageBubble({
    text: `🚧 **${featureName}** is currently under development and will be available in a future update.`,
    role: 'ai'
  });
}

// File Upload Logic
attachBtn.addEventListener('click', () => {
  fileInput.click();
});

// Helper: Extract text from PDF
async function extractTextFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += `--- Page ${i} ---\n${pageText}\n\n`;
  }
  return fullText;
}

// Helper: Extract text from Image (OCR)
async function extractTextFromImage(file) {
  const worker = await Tesseract.createWorker('eng');
  const ret = await worker.recognize(file);
  await worker.terminate();
  return ret.data.text;
}

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Check file size (max 50MB)
  if (file.size > 50 * 1024 * 1024) {
    alert('File is too large. Please upload a file smaller than 50MB.');
    this.value = '';
    return;
  }

  // Show loading state
  fileNameSpan.textContent = "Processing file...";
  filePreview.classList.remove('hidden');

  try {
    let content = '';
    
    if (file.type === 'application/pdf') {
      content = await extractTextFromPdf(file);
    } else if (file.type.startsWith('image/')) {
      // Read image as Data URL for preview
      currentFileImage = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
      content = await extractTextFromImage(file);
    } else {
      // Text files
      content = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
      });
    }

    currentFileContent = content;
    currentFileName = file.name;
    fileNameSpan.textContent = file.name;
    
  } catch (error) {
    console.error('File processing error:', error);
    alert('Error processing file. Please try again.');
    clearFile();
  }
});

function clearFile() {
  fileInput.value = '';
  currentFileContent = null;
  currentFileName = null;
  currentFileImage = null;
  filePreview.classList.add('hidden');
}

removeFileBtn.addEventListener('click', clearFile);

micBtn.addEventListener('click', () => showFeatureNotReady('Voice Input'));

// Initialize on load
window.addEventListener('load', () => {
  messageInput.focus();
  // Optional: Add welcome message
  addMessageBubble({ 
    text: '👋 Hello! I\'m Veness. A Personal AI assistant made by Ayush Vijay Vishwakarma for himself. I can remember 20 previous conversations!. Nothing here saves so you can ask anything and nobody will ever get your identity.', 
    role: 'ai',
    showActions: false
  });

  // Mobile App Optimization: Handle Virtual Keyboard
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      // When keyboard opens/closes, ensure we stay at bottom if we were there
      scrollToBottom();
      
      // Adjust layout if needed (e.g. for iOS Safari)
      /*
      if (window.visualViewport.height < window.innerHeight) {
        // Keyboard is likely open
        document.body.style.height = window.visualViewport.height + 'px';
        window.scrollTo(0, 0); // Prevent document scroll
      } else {
        document.body.style.height = '100%';
      }
      */
    });
  }
});

// Hidden Stats Logic
let logoClicks = 0;
let clickResetTimer = null;

appLogo.addEventListener('click', () => {
  logoClicks++;
  
  // Reset clicks if user stops clicking for 5 seconds
  clearTimeout(clickResetTimer);
  clickResetTimer = setTimeout(() => {
    logoClicks = 0;
  }, 5000);

  if (logoClicks === 30) {
    showStatsModal();
    logoClicks = 0;
  }
});

async function showStatsModal() {
  statsModal.classList.remove('hidden');
  statsModal.classList.add('flex');
  
  try {
    const response = await fetch('/api/stats');
    const data = await response.json();
    visitorCount.textContent = data.visits.toLocaleString();
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    visitorCount.textContent = 'Error';
  }
}

closeStatsBtn.addEventListener('click', () => {
  statsModal.classList.add('hidden');
  statsModal.classList.remove('flex');
});

statsModal.addEventListener('click', (e) => {
  if (e.target === statsModal) {
    statsModal.classList.add('hidden');
    statsModal.classList.remove('flex');
  }
});

// Image Modal Logic
function openImageModal(src) {
  const modal = document.getElementById('imageModal');
  const img = document.getElementById('fullImage');
  img.src = src;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeImageModal() {
  const modal = document.getElementById('imageModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  document.getElementById('fullImage').src = '';
}

// Event Listeners for Image Modal
if (closeImageBtn) {
  closeImageBtn.addEventListener('click', closeImageModal);
}

const imageModal = document.getElementById('imageModal');
if (imageModal) {
  imageModal.addEventListener('click', (e) => {
    if (e.target === imageModal) {
      closeImageModal();
    }
  });
}
