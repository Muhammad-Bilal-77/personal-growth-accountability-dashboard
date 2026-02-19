# AI Academic Chatbot Setup Guide

This guide will help you set up the AI-powered academic chatbot feature using **Google Gemini** (completely FREE!) in your Daily Sanctuary application.

## Overview

The AI chatbot is an intelligent assistant integrated into the Academic Repository page. It uses Google's Gemini AI, which is completely free to use with generous limits. It can:
- Answer questions about lesson content
- Explain concepts and topics
- Provide study assistance
- Help with understanding academic materials
- Maintain conversation context for follow-up questions
- **Access your entire academic repository** (all subjects, chapters, and lessons)
- **Summarize any chapter or subject**
- **Compare different lessons or topics**
- **Provide overviews of your study materials**

## Features

### 1. Context-Aware Responses
The chatbot automatically receives context about:
- Current lesson title and content
- Subject and chapter information
- Conversation history (last 5 messages)

### 2. Interactive UI
- **Floating chat window**: Positioned at bottom-right corner
- **Minimize/Maximize**: Click to minimize to a button or expand to full screen
- **Real-time responses**: Streaming-like experience with loading indicators
- **Clear conversation**: Reset chat history anytime
- **Message history**: View all previous messages with timestamps

### 3. Smart Integration
The chatbot appears on the Academic Repository page and automatically updates its context when you:
- Switch between lessons
- View different subjects or chapters

## Setup Instructions

### Step 1: Get Google Gemini API Key (FREE!)

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Select your Google Cloud project (or create a new one)
5. Copy the generated API key

> **Note**: Google Gemini is completely FREE with generous usage limits! No credit card required. You get 60 requests per minute for free.

### Step 2: Configure Environment Variables

1. Open your `.env` file in the project root (create one if it doesn't exist)
2. Add the following line:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```
3. Replace `your_api_key_here` with the API key you copied from Google AI Studio

Example `.env` file:
```env
# ... other environment variables ...

# Google Gemini API (for AI chatbot features - FREE!)
GEMINI_API_KEY=AIzaSyABC123def456GHI789jkl012MNO345pqr
```

### Step 3: Restart the Server

After adding the API key:
1. Stop your backend server (Ctrl+C in the terminal)
2. Restart it with: `npm run dev:server`
3. The chatbot should now be fully functional!

## Using the Chatbot

### Opening the Chatbot
1. Navigate to the **Academic Repository** page
2. The chatbot will appear as a floating window in the bottom-right corner
3. If minimized, click the bot icon button to open it

### Having a Conversation
1. Type your question in the input field
2. Press Enter or click the Send button
3. Wait for the AI to process and respond
4. Continue the conversation - the bot remembers context!

### Example Questions You Can Ask
- "Explain the main concept of this lesson"
- "What are the key points I should remember?"
- "Can you give me an example of [concept]?"
- "How does this relate to [other topic]?"
- "Help me understand [specific section]"
- **"What subjects do I have in my repository?"**
- **"Summarize chapter 3"**
- **"What lessons are in the BLD subject?"**
- **"Compare chapter 1 and chapter 2"**
- **"Give me an overview of all my lessons"**
- **"What topics are covered in my repository?"**

### Tips for Best Results
- **Be specific**: Ask clear, focused questions
- **Provide context**: If the bot doesn't have enough info, mention what you're asking about
- **Follow up**: The bot remembers your conversation, so you can ask follow-up questions
- **Use the lesson viewer**: Open a lesson first so the bot has full context

## Customization

### Changing the AI Model

## Customization

### Changing the AI Model

By default, the chatbot uses `gemini-1.5-flash` (Google's best free model). To use a different Gemini model:

1. Open `server/index.js`
2. Find the chat endpoint (around line 1467)
3. Change the model parameter:
   ```javascript
   const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
   ```

Available Gemini models:
- `gemini-1.5-flash`: Fast and efficient (completely FREE!)
- `gemini-1.5-pro`: More capable for complex tasks (FREE with limits)
- `gemini-1.0-pro`: Older model but still available

### Modifying System Prompt

To change how the bot behaves, edit the `systemMessage` in `server/index.js`:
```javascript
let systemMessage = "You are a helpful academic assistant...";
```

## Troubleshooting

### Chatbot says "AI service not configured"
- **Solution**: Make sure you've added `GEMINI_API_KEY` to your `.env` file and restarted the server

### "Failed to send message" error
- **Check**: Is your Gemini API key valid?
- **Check**: Have you exceeded the rate limit (60 requests/minute)?
- **Check**: Is your backend server running?
- **Check**: Do you have internet connectivity?

### Chatbot gives generic responses
- **Solution**: Make sure you have a lesson open with content
- **Solution**: Try being more specific in your questions

### Rate limit errors
- **Solution**: Wait a minute before sending more requests (free tier: 60 requests/minute)
- **Solution**: You can upgrade to a paid plan for higher limits if needed (but the free tier is very generous!)

## Security Notes

⚠️ **Important Security Considerations**:

1. **Never commit your `.env` file** - It's already in `.gitignore`
2. **Keep your API key secret** - Don't share it publicly
3. **Monitor usage** - Check your Google AI Studio dashboard regularly
4. **Rotate keys** - If exposed, revoke and create a new key immediately
5. **Set API restrictions** - You can restrict your API key to specific IPs or domains in Google Cloud Console

## Cost Estimation

🎉 **Great News**: Google Gemini is **COMPLETELY FREE!**

Using `gemini-pro`:
- **Cost**: $0.00 (FREE!)
- **Rate limit**: 60 requests per minute
- **Token limit**: Very generous
- **No credit card required**: Just sign in with your Google account!

💡 **Tip**: This is perfect for students and educational projects!

## Alternative AI Providers

While this implementation now uses Google Gemini (FREE), you can easily adapt it to use:
- **OpenAI GPT**: More expensive but very capable
- **Anthropic Claude**: More concise responses, different pricing
- **Local models**: Ollama, LM Studio for completely free and private operation

To switch providers, you'll need to:
1. Install the appropriate SDK
2. Update the chat endpoint in `server/index.js`
3. Adjust the API call format

## Support

For issues or questions:
1. Check the console logs in your browser (F12 → Console)
2. Check the server logs in your terminal
3. Verify all environment variables are set correctly
4. Ensure your Gemini API key is valid and active

**Gemini API Documentation**: https://ai.google.dev/docs

---

**Happy Learning! 🎓🤖 (Powered by FREE Google Gemini!)**
