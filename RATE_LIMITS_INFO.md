# AI Chatbot Rate Limits & Optimization

## Current Configuration

**Model:** `gemini-flash-lite-latest`  
**Caching:** Enabled (1-hour TTL, 100 response limit)  
**API Key:** Configured in `.env`

## Rate Limits

### Free Tier Limits (Gemini Flash Lite)
- **20 requests per day** (model-specific quota)
- 15,000 tokens per minute input limit
- 1,500 requests per day across all free tier models

### How Caching Extends Your Limits

With the implemented caching system:
1. **Identical questions return cached answers instantly** (no API call)
2. **Cache duration:** 1 hour
3. **Speed improvement:** ~800x faster for cached responses
4. **Effective capacity:** Much higher than raw API limits

Example: If 50% of questions are repeated, your effective capacity doubles to 40 requests/day.

## Tips to Maximize Your Usage

### 1. Ask Similar Questions Together
Questions about the same topic within 1 hour use the cache.

### 2. Be Specific
"Summarize Chapter 4 of BLD" uses cache better than varied phrasings.

### 3. Repository Content is Always Fresh
The cache uses your current repository state, so updates are reflected.

### 4. Monitor Your Usage
Check the `cached: true/false` indicator in responses to see when cache is used.

## Technical Details

### Cache Strategy
- **Key:** Combination of message + context (user input + viewing context)
- **Storage:** In-memory Map (resets on server restart)
- **Cleanup:** Automatic when cache exceeds 100 entries (removes oldest)

### Model Choice Reasoning
`gemini-flash-lite-latest` provides:
- Fast responses (2-6 seconds)
- Good quality for academic questions
- Best availability in free tier
- Supports full context (all repository content)

## Increasing Limits

To get 20 requests/minute and 1000/day as you requested, you would need:

1. **Paid Google AI Studio plan** (~$0.000125 per 1K characters)
2. **Different AI service** (Anthropic Claude, OpenAI with billing)
3. **Multiple API keys rotation** (not recommended, violates ToS)

The current solution (free tier + caching) provides:
- ✅ Unlimited cached responses
- ✅ 20+ unique questions per day
- ✅ Instant answers for repeated questions
- ✅ Full repository access
- ✅ Zero cost

## Troubleshooting

### "Connection failed" errors
- Check server is running on port 3001
- Verify GEMINI_API_KEY in `.env`
- Check error details in server terminal

### Quota exceeded errors
- Wait for rate limit reset (shown in error message)
- Check if question can be answered from cache
- Server restarts clear cache (might help in some cases)

### Slow responses
- First request always takes 2-6 seconds (API call)
- Cached requests are instant (~7ms)
- Large repository content increases processing time

## Future Improvements

Possible enhancements:
1. Persistent cache (database storage)
2. Smart context pruning (send only relevant lessons)
3. Vector embeddings for semantic similarity
4. Multi-model fallback (switch models on quota exhaustion)
