# Chat History Persistence Setup Guide

This document explains how to set up chat history persistence in the Daily Sanctuary application. Chat histories are now automatically saved to Supabase for cross-device access.

## What's New

- ✅ Chat sessions are automatically saved to Supabase
- ✅ Chat history persists across devices and browsers
- ✅ Google Drive file links are tracked alongside Supabase metadata
- ✅ Automatic fallback to localStorage if Supabase is temporarily unavailable
- ✅ User-owned sessions (only owner can access their chats)

## Database Schema

Two new tables have been created:

### 1. `chat_sessions`
Stores chat session metadata:
```sql
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,                    -- Username of the session owner
  title TEXT NOT NULL,             -- Auto-generated from first message
  drive_file_id TEXT,              -- Google Drive file ID (optional)
  drive_file_link TEXT,            -- Google Drive share link (optional)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. `chat_messages`
Stores individual messages within a session:
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Required Setup Steps

### Step 1: Create Database Tables

You have two options:

#### Option A: Using Migrations (Recommended)
If you have access to `SUPABASE_DB_URL`, run:
```bash
node server/run-migrations.js
```

This will execute [017_chat_history.sql](server/migrations/017_chat_history.sql) automatically.

#### Option B: Manual SQL Execution (Supabase Dashboard)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your Daily Sanctuary project
3. Navigate to SQL Editor
4. Create a new query
5. Copy and paste the SQL from [server/migrations/017_chat_history.sql](server/migrations/017_chat_history.sql)
6. Click "Run"

**SQL to execute:**
```sql
-- Chat history table to persist conversation metadata
create table if not exists chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  title text not null,
  drive_file_id text,
  drive_file_link text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Full chat message history
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- Indexes for faster queries
create index if not exists idx_chat_sessions_user_id on chat_sessions(user_id);
create index if not exists idx_chat_sessions_created_at on chat_sessions(created_at desc);
create index if not exists idx_chat_messages_session_id on chat_messages(session_id);
```

### Step 2: Restart the Server

```bash
# Kill any existing server process
# Then restart:
node server/index.js
```

### Step 3: Test the Implementation

#### Test Save Chat History:
```bash
curl -X POST http://localhost:3001/api/chat/save-history \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Test Chat",
    "messages": [
      {"role": "user", "content": "Hello"},
      {"role": "assistant", "content": "Hi there!"}
    ]
  }'
```

#### Test Load Chat History:
```bash
curl -X GET http://localhost:3001/api/chat/history \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Test Load Specific Session:
```bash
curl -X GET http://localhost:3001/api/chat/session/{SESSION_ID} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## API Endpoints

### Save Chat History
**Endpoint:** `POST /api/chat/save-history`
**Auth:** Required (JWT token)
**Body:**
```json
{
  "title": "Chat summary",
  "messages": [
    {"role": "user", "content": "User message"},
    {"role": "assistant", "content": "AI response"}
  ],
  "driveFileId": "optional_drive_file_id",
  "driveFileLink": "optional_drive_share_link"
}
```
**Response:**
```json
{
  "success": true,
  "sessionId": "uuid",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### Get All Chat Histories
**Endpoint:** `GET /api/chat/history`
**Auth:** Required (JWT token)
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Chat title",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:35:00Z",
      "drive_file_id": "optional",
      "drive_file_link": "optional"
    }
  ]
}
```

### Get Specific Chat Session
**Endpoint:** `GET /api/chat/session/{sessionId}`
**Auth:** Required (JWT token)
**Response:**
```json
{
  "success": true,
  "session": {
    "id": "uuid",
    "user_id": "muneeb",
    "title": "Chat title",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:35:00Z"
  },
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "Question",
      "created_at": "2024-01-15T10:30:00Z"
    },
    {
      "id": "uuid",
      "role": "assistant",
      "content": "Answer",
      "created_at": "2024-01-15T10:31:00Z"
    }
  ]
}
```

### Delete Chat Session
**Endpoint:** `DELETE /api/chat/session/{sessionId}`
**Auth:** Required (JWT token)
**Response:**
```json
{
  "success": true,
  "message": "Chat session deleted"
}
```

## Frontend Integration

The AcademicChatbot component has been updated to:

1. **Load chat history from Supabase** on app startup
2. **Save chats to Supabase** when user clicks "Save Chat"
3. **Load saved chats** from Supabase when selected from sidebar
4. **Delete chats** from Supabase
5. **Fallback to localStorage** if Supabase is temporarily unavailable

### How It Works:

```typescript
// Auto-save on startup
loadChatHistory() // Tries Supabase first, fallback to localStorage

// Manual save
saveCurrentChat() // Saves to both localStorage and Supabase

// Load specific chat
loadChat(sessionId) // Detects UUID format and loads from Supabase

// Delete chat
deleteChat(sessionId) // Deletes from both localStorage and Supabase
```

## Troubleshooting

### Tables Not Found Error
If you see `"Could not find the table 'public.chat_sessions' in the schema cache"`:

1. Verify you've executed the SQL from step 1
2. Clear Supabase cache by waiting 30 seconds
3. Restart the server

### Unauthorized Error
If you get `"Unauthorized"` when testing endpoints:

1. Ensure your JWT token is valid
2. Login again to get a fresh token:
   ```bash
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"muneeb","password":"u1k5@9aw"}'
   ```

### Chat Not Saving
If chats save to localStorage but not Supabase:

1. Check browser console for errors
2. Verify Supabase is configured correctly
3. Check that tables exist in Supabase dashboard
4. Review server logs for database errors

## Fallback Behavior

The application is designed with automatic fallback:

1. **Primary:** Supabase (persistent across devices)
2. **Fallback:** localStorage (device-local storage)
3. **Result:** Chats are always saved somewhere

Users will see:
- "Chat saved to cloud!" - Successfully saved to Supabase
- "Chat saved locally (cloud temporarily unavailable)" - Using localStorage fallback
- Both automatically sync when Supabase becomes available again

## Security Notes

- Each chat session is tied to the authenticated user (`user_id`)
- Users can only view/delete their own sessions (verified server-side)
- JWT tokens are required for all chat endpoints
- Messages are stored in plaintext in Supabase (encrypt if sensitive data expected)

## Future Enhancements

- Encryption of chat content
- Automatic sync of Drive file links to Supabase
- Chat search functionality
- Collaborative chat sessions
- Chat export to PDF/Word
