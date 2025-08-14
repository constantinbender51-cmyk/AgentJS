const express = require('express');
const path = require('path');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- CONFIGURATION ---
// Load environment variables from Railway's dashboard
const GEMINI_API_KEY = process.env.GOOGLE_API_KEY;
const NTFY_TOPIC_URL = process.env.NTFY_TOPIC_URL;
const PORT = process.env.PORT || 3000;

// --- INITIALIZATION ---
const app = express();
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// --- MIDDLEWARE ---
// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
// Parse JSON bodies for API requests
app.use(express.json());

// --- AI TOOLS (THE AGENT'S ABILITIES) ---
const tools = {
  // Tool to get the current time
  getCurrentTime: () => {
    return new Date().toUTCString();
  },
  // Tool to send a notification via ntfy
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
  model: "gemini-1.5-flash", // Or another suitable model
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
      // --- Handle Function Calling ---
      const call = functionCalls[0]; // Handle one function call at a time for simplicity
      const functionToCall = tools[call.name];

      if (functionToCall) {
        const functionResult = await functionToCall(call.args);

        // Send the result back to the model
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
        
        // Send the model's final text response to the user
        res.json({ message: followUpResult.response.text() });
      } else {
        res.status(500).json({ error: `Unknown function call: ${call.name}` });
      }
    } else {
      // --- Handle Regular Text Response ---
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
