-- ==============================================================================
-- AURORA INTELLIGENCE LAYER — PRODUCTION DATABASE SCHEMA EXTENSION
-- Execute this SQL script in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================




-- 2. RECENT ACTIVITY TABLE
CREATE TABLE IF NOT EXISTS public.recent_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- 'opened', 'edited', 'created'
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.recent_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own recent activity" ON public.recent_activity;
CREATE POLICY "Users can view their own recent activity"
    ON public.recent_activity FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own recent activity" ON public.recent_activity;
CREATE POLICY "Users can insert their own recent activity"
    ON public.recent_activity FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own recent activity" ON public.recent_activity;
CREATE POLICY "Users can delete their own recent activity"
    ON public.recent_activity FOR DELETE USING (auth.uid() = user_id);


-- 3. PINNED COLLECTIONS TABLE
CREATE TABLE IF NOT EXISTS public.pinned_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    collection_key TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, collection_key)
);

ALTER TABLE public.pinned_collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own pinned collections" ON public.pinned_collections;
CREATE POLICY "Users can view their own pinned collections"
    ON public.pinned_collections FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own pinned collections" ON public.pinned_collections;
CREATE POLICY "Users can insert their own pinned collections"
    ON public.pinned_collections FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own pinned collections" ON public.pinned_collections;
CREATE POLICY "Users can delete their own pinned collections"
    ON public.pinned_collections FOR DELETE USING (auth.uid() = user_id);


-- INDEXES FOR PERFORMANCE & FAST RETRIEVAL
CREATE INDEX IF NOT EXISTS idx_recent_activity_user_time ON public.recent_activity(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pinned_collections_user ON public.pinned_collections(user_id);
