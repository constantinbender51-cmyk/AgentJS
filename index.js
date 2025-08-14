const express = require('express');
const path = require('path');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- CONFIGURATION & VALIDATION ---
console.log("Server starting up with @google/generative-ai SDK...");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const NTFY_TOPIC_URL = process.env.NTFY_TOPIC_URL;
const PORT = process.env.PORT || 3000;

if (!GEMINI_API_KEY) {
  console.error("FATAL ERROR: GEMINI_API_KEY environment variable is not set.");
  process.exit(1); 
}

console.log("Found GEMINI_API_KEY. NTFY_TOPIC_URL is set to:", NTFY_TOPIC_URL || "Not Set");

// --- INITIALIZATION ---
const app = express();
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// --- MIDDLEWARE ---
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// --- AI TOOLS (THE AGENT'S ABILITIES) ---
const tools = {
  getCurrentTime: () => {
    return new Date().toUTCString();
  },
  sendNotification: async ({ message }) => {
    if (!NTFY_TOPIC_URL) {
      return "Error: NTFY_TOPIC_URL is not configured.";
    }
    try {
      await axios.post(NTFY_TOPIC_URL, message, {
        headers: { 'Content-Type': 'text/plain' },
      });
      return `Successfully sent notification: "${message}"`;
    } catch (error) {
      console.error('Error sending ntfy notification:', error.message);
      return `Failed to send notification. Error: ${error.message}`;
    }
  },
};

// --- GEMINI MODEL CONFIGURATION ---
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash", // Using the model name you have confirmed.
  tools: {
    functionDeclarations: [
      {
        name: "getCurrentTime",
        description: "Get the current date and time.",
        parameters: { type: "object", properties: {} },
      },
      {
        name: "sendNotification",
        description: "Send a push notification message to the user's phone.",
        parameters: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "The content of the message to send.",
            },
          },
          required: ["message"],
        },
      },
    ],
  },
});

// --- API ENDPOINT FOR CHAT ---
app.post('/chat', async (req, res) => {
  try {
    const { history } = req.body;
    if (!history) {
      return res.status(400).json({ error: 'History is required.' });
    }

    const chat = model.startChat({ history });
    const userMessage = history[history.length - 1].parts[0].text;
    const result = await chat.sendMessage(userMessage);
    const response = result.response;

    const functionCalls = response.functionCalls;

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      const functionToCall = tools[call.name];

      if (functionToCall) {
        const functionResult = await functionToCall(call.args);
        const followUpResult = await chat.sendMessage([
          {
            functionResponse: {
              name: call.name,
              response: {
                content: functionResult,
              },
            },
          },
        ]);
        res.json({ message: followUpResult.response.text() });
      } else {
        res.status(500).json({ error: `Unknown function call: ${call.name}` });
      }
    } else {
      res.json({ message: response.text() });
    }
  } catch (error) {
    console.error('Error in /chat endpoint:', error);
    res.status(500).json({ error: 'An error occurred while processing your request.' });
  }
});

// --- START SERVER ---
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
