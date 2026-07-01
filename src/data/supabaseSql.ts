export const SUPABASE_SETUP_SQL = `-- EduNova Supabase with pgvector Schema & Semantic Cache Configuration
-- Copy and run this script in your Supabase SQL Editor (https://supabase.com)

-- 1. Enable pgvector extension
create extension if not exists vector;

-- 2. Create user profiles table for persistent relational data (Plan Tracker)
create table if not exists public.user_profiles (
  user_id text primary key,
  plan_id text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on user_profiles
alter table public.user_profiles enable row level security;

DO $$ 
BEGIN
  drop policy if exists "Allow public access for profiles" on public.user_profiles;
EXCEPTION WHEN OTHERS THEN 
  NULL; 
END $$;

create policy "Allow public access for profiles"
  on public.user_profiles for all
  using (true)
  with check (true);

-- 3. Create user itineraries table (persists student selected subject and topics)
create table if not exists public.user_itineraries (
  user_id text primary key,
  subject_id text not null,
  topic_ids text[] not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on user_itineraries
alter table public.user_itineraries enable row level security;

DO $$ 
BEGIN
  drop policy if exists "Allow public access for itineraries" on public.user_itineraries;
EXCEPTION WHEN OTHERS THEN 
  NULL; 
END $$;

create policy "Allow public access for itineraries"
  on public.user_itineraries for all
  using (true)
  with check (true);

-- 4. Create semantic_cache table for storing past resolved factual questions
create table if not exists public.semantic_cache (
  id bigint generated always as identity primary key,
  query text not null,
  response text not null,
  subject text,
  topic_id text,
  is_factual boolean default true,
  embedding vector(768) not null, -- gemini-embedding-2-preview returns 768 dimensions
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index the embedding vector using HNSW index (high-performance cosine similarity)
create index if not exists semantic_cache_hnsw_idx 
  on public.semantic_cache 
  using hnsw (embedding vector_cosine_ops);

-- Enable RLS on semantic_cache
alter table public.semantic_cache enable row level security;

DO $$ 
BEGIN
  drop policy if exists "Allow public access for semantic cache" on public.semantic_cache;
EXCEPTION WHEN OTHERS THEN 
  NULL; 
END $$;

create policy "Allow public access for semantic cache"
  on public.semantic_cache for all
  using (true)
  with check (true);

-- 5. Stored Procedure for Semantic Cache Similarity Matching (using Cosine Similarity)
create or replace function match_semantic_cache (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  subject_filter text default null
)
returns table (
  id bigint,
  query text,
  response text,
  is_factual boolean,
  similarity float
)
language sql stable
as $$
  select
    semantic_cache.id,
    semantic_cache.query,
    semantic_cache.response,
    semantic_cache.is_factual,
    1 - (semantic_cache.embedding <=> query_embedding) as similarity
  from semantic_cache
  where
    (subject_filter is null or semantic_cache.subject = subject_filter)
    and 1 - (semantic_cache.embedding <=> query_embedding) > match_threshold
  order by semantic_cache.embedding <=> query_embedding
  limit match_count;
$$;

-- 6. Create user chats table for durable chat history persistence
create table if not exists public.user_chats (
  id bigint generated always as identity primary key,
  user_id text not null,
  subject_id text not null,
  topic_id text not null,
  topic_name text not null,
  messages jsonb not null, -- Stores the JSON array of Message items [{role: 'user', text: '...'}, ...]
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_user_topic unique (user_id, topic_id)
);

-- Enable RLS on user_chats
alter table public.user_chats enable row level security;

DO $$ 
BEGIN
  drop policy if exists "Allow public access for user chats" on public.user_chats;
EXCEPTION WHEN OTHERS THEN 
  NULL; 
END $$;

create policy "Allow public access for user chats"
  on public.user_chats for all
  using (true)
  with check (true);

`;
