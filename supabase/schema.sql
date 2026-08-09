-- ==============================================================================
-- AURORA: DIGITAL MEMORY VAULT - COMPLETE PRODUCTION DATABASE & STORAGE SCHEMA
-- Execute this SQL script in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. PROFILES TABLE CREATION
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. AUTOMATIC PROFILE CREATION TRIGGER & FUNCTION
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, created_at, updated_at, last_login)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Vault Explorer'),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
        avatar_url = COALESCE(NULLIF(public.profiles.avatar_url, ''), EXCLUDED.avatar_url),
        last_login = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 3. MEMORIES TABLE (PROMPT 02 & PROMPT 03 EXTENSIONS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    memory_type TEXT NOT NULL DEFAULT 'photo', -- 'photo', 'video', 'voice', 'journal', 'mixed'
    category TEXT DEFAULT 'Personal',
    cover_image TEXT,
    gallery TEXT[] DEFAULT '{}',
    audio_url TEXT,
    video_url TEXT,
    tags TEXT[] DEFAULT '{}',
    location TEXT,
    mood TEXT DEFAULT 'Happy',
    favorite BOOLEAN DEFAULT FALSE,
    private BOOLEAN DEFAULT TRUE,
    archived BOOLEAN DEFAULT FALSE,            -- PROMPT 03
    deleted BOOLEAN DEFAULT FALSE,             -- PROMPT 03 Soft Delete
    deleted_at TIMESTAMP WITH TIME ZONE,       -- PROMPT 03
    memory_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Ensure Prompt 03 columns exist on existing memories table
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own memories" ON public.memories;
CREATE POLICY "Users can view their own memories"
    ON public.memories FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own memories" ON public.memories;
CREATE POLICY "Users can insert their own memories"
    ON public.memories FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own memories" ON public.memories;
CREATE POLICY "Users can update their own memories"
    ON public.memories FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own memories" ON public.memories;
CREATE POLICY "Users can delete their own memories"
    ON public.memories FOR DELETE USING (auth.uid() = user_id);

-- ==============================================================================
-- 4. COLLECTIONS & COLLECTION_ITEMS TABLES (PROMPT 03)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'Folder',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view collections" ON public.collections;
CREATE POLICY "Users view collections" ON public.collections FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert collections" ON public.collections;
CREATE POLICY "Users insert collections" ON public.collections FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update collections" ON public.collections;
CREATE POLICY "Users update collections" ON public.collections FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete collections" ON public.collections;
CREATE POLICY "Users delete collections" ON public.collections FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.collection_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
    memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(collection_id, memory_id)
);

ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view collection_items" ON public.collection_items;
CREATE POLICY "Users view collection_items" ON public.collection_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.collections WHERE id = collection_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users insert collection_items" ON public.collection_items;
CREATE POLICY "Users insert collection_items" ON public.collection_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.collections WHERE id = collection_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users delete collection_items" ON public.collection_items;
CREATE POLICY "Users delete collection_items" ON public.collection_items FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.collections WHERE id = collection_id AND user_id = auth.uid())
);

-- ==============================================================================
-- 5. SUPABASE STORAGE BUCKETS
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('memories', 'memories', false, 104857600, ARRAY['image/*', 'video/*', 'audio/*']),
    ('memory-images', 'memory-images', false, 52428800, ARRAY['image/*']),
    ('memory-videos', 'memory-videos', false, 524288000, ARRAY['video/*']),
    ('memory-audio', 'memory-audio', false, 104857600, ARRAY['audio/*'])
ON CONFLICT (id) DO UPDATE SET public = false;

-- ==============================================================================
-- 6. HIGH-PERFORMANCE DATABASE INDEXES FOR INSTANT VAULT QUERIES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_memories_user_status ON public.memories(user_id, deleted, archived);
CREATE INDEX IF NOT EXISTS idx_memories_user_date ON public.memories(user_id, memory_date DESC);
CREATE INDEX IF NOT EXISTS idx_memories_user_favorite ON public.memories(user_id, favorite);
CREATE INDEX IF NOT EXISTS idx_memories_user_type ON public.memories(user_id, memory_type);
CREATE INDEX IF NOT EXISTS idx_collection_items_comp ON public.collection_items(collection_id, memory_id);

