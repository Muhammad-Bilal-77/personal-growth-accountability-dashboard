#!/usr/bin/env node

/**
 * Quick Setup Script for Chat History Tables
 * 
 * This script helps set up the chat history tables in your Supabase instance.
 * It outputs the SQL that needs to be executed in the Supabase SQL Editor.
 */

const fs = require('fs');
const path = require('path');

const createTables = `
-- ==============================================================
-- Chat History Tables Setup
-- Copy and paste this SQL into your Supabase SQL Editor:
-- https://app.supabase.com -> SQL Editor -> New Query
-- ==============================================================

-- Chat history table to persist conversation metadata
create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  title text not null,
  drive_file_id text,
  drive_file_link text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Full chat message history
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- Indexes for faster queries
create index if not exists idx_chat_sessions_user_id on public.chat_sessions(user_id);
create index if not exists idx_chat_sessions_created_at on public.chat_sessions(created_at desc);
create index if not exists idx_chat_messages_session_id on public.chat_messages(session_id);

-- ==============================================================
-- Table setup complete!
-- ==============================================================
`;

console.log(createTables);
console.log('\n📝 Instructions:');
console.log('1. Copy the SQL above');
console.log('2. Go to https://app.supabase.com');
console.log('3. Select your Daily Sanctuary project');
console.log('4. Navigate to "SQL Editor"');
console.log('5. Click "New Query"');
console.log('6. Paste the SQL');
console.log('7. Click "Run"');
console.log('\n✓ After running the SQL, restart the server:');
console.log('   node server/index.js\n');
