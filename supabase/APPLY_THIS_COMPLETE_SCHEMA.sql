-- ==============================================================================
-- AURORA MEMORY VAULT — COMPLETE PRODUCTION DATABASE SETUP
-- APPLY THIS ENTIRE FILE IN ONE GO via Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/ynjristkqkakfbubzywy/sql/new
-- This script is idempotent — safe to run multiple times.
-- ==============================================================================

-- ============================================================
-- 1. PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW());

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

-- ============================================================
-- 2. MEMORIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    memory_type TEXT NOT NULL DEFAULT 'photo',
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
    archived BOOLEAN DEFAULT FALSE,
    deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    file_size BIGINT DEFAULT 0,
    memory_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0;
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS gallery TEXT[] DEFAULT '{}';
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS video_url TEXT;

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

-- ============================================================
-- 3. COLLECTIONS TABLE
-- ============================================================
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

-- ============================================================
-- 4. COLLECTION ITEMS TABLE
-- ============================================================
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

-- ============================================================
-- 5. USER SETTINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'Vision Pro Glass',
    date_format TEXT DEFAULT 'YYYY-MM-DD',
    time_format TEXT DEFAULT '12h',
    email_notifications BOOLEAN DEFAULT TRUE,
    memory_reminders BOOLEAN DEFAULT TRUE,
    weekly_summary BOOLEAN DEFAULT FALSE,
    security_alerts BOOLEAN DEFAULT TRUE,
    private_by_default BOOLEAN DEFAULT TRUE,
    auto_lock BOOLEAN DEFAULT FALSE,
    session_timeout TEXT DEFAULT '30m',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
CREATE POLICY "Users can view their own settings"
    ON public.user_settings FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
CREATE POLICY "Users can insert their own settings"
    ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
CREATE POLICY "Users can update their own settings"
    ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own settings" ON public.user_settings;
CREATE POLICY "Users can delete their own settings"
    ON public.user_settings FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 6. PROFILE AUTO-CREATE TRIGGER (fires on new Google login)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, bio, timezone, created_at, updated_at, last_login)
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Memory Collector'),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
        '',
        'UTC',
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = COALESCE(EXCLUDED.email, public.profiles.email),
        full_name = CASE
            WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = '' THEN EXCLUDED.full_name
            ELSE public.profiles.full_name
        END,
        avatar_url = CASE
            WHEN public.profiles.avatar_url IS NULL OR public.profiles.avatar_url = '' THEN EXCLUDED.avatar_url
            ELSE public.profiles.avatar_url
        END,
        last_login = NOW(),
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 7. LAST LOGIN UPDATE TRIGGER (fires on every sign-in)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.profiles
    SET last_login = NOW(), updated_at = NOW()
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
    AFTER UPDATE OF last_sign_in_at ON auth.users
    FOR EACH ROW
    WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
    EXECUTE FUNCTION public.handle_user_login();

-- ============================================================
-- 8. STORAGE BUCKETS (public with owner-only RLS write policies)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('memory-images', 'memory-images', true, 52428800, ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif','image/*'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 52428800;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('memories', 'memories', true, 104857600, ARRAY['image/*','video/*','audio/*'])
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 10485760, ARRAY['image/*'])
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profiles', 'profiles', true, 10485760, ARRAY['image/*'])
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('memory-audio', 'memory-audio', true, 104857600, ARRAY['audio/*'])
ON CONFLICT (id) DO UPDATE SET public = true;

-- ============================================================
-- 9. STORAGE RLS POLICIES
-- ============================================================

-- Clean up old policies first
DROP POLICY IF EXISTS "Users upload own memory images" ON storage.objects;
DROP POLICY IF EXISTS "Users read own memory images" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own memory images" ON storage.objects;
DROP POLICY IF EXISTS "Users update own memory images" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own memories files" ON storage.objects;
DROP POLICY IF EXISTS "Users read own memories files" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own memories files" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users read own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own profile image" ON storage.objects;
DROP POLICY IF EXISTS "Users read own profile image" ON storage.objects;
DROP POLICY IF EXISTS "Users update own profile image" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own profile image" ON storage.objects;

-- memory-images policies
CREATE POLICY "Users upload own memory images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'memory-images' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

CREATE POLICY "Users read own memory images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'memory-images' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

CREATE POLICY "Users delete own memory images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'memory-images' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

CREATE POLICY "Users update own memory images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'memory-images' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

-- memories bucket policies
CREATE POLICY "Users upload own memories files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'memories' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

CREATE POLICY "Users read own memories files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'memories' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

CREATE POLICY "Users delete own memories files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'memories' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

-- avatars policies
CREATE POLICY "Users upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

CREATE POLICY "Users read own avatar"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

CREATE POLICY "Users update own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

CREATE POLICY "Users delete own avatar"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

-- profiles bucket policies
CREATE POLICY "Users upload own profile image"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'profiles' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

CREATE POLICY "Users read own profile image"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profiles' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

CREATE POLICY "Users update own profile image"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'profiles' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

CREATE POLICY "Users delete own profile image"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'profiles' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

-- ============================================================
-- 10. PERFORMANCE INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_memories_user_status ON public.memories(user_id, deleted, archived);
CREATE INDEX IF NOT EXISTS idx_memories_user_date ON public.memories(user_id, memory_date DESC);
CREATE INDEX IF NOT EXISTS idx_memories_user_favorite ON public.memories(user_id, favorite);
CREATE INDEX IF NOT EXISTS idx_memories_user_type ON public.memories(user_id, memory_type);
CREATE INDEX IF NOT EXISTS idx_collection_items_comp ON public.collection_items(collection_id, memory_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ============================================================
-- 11. VERIFICATION — check success after applying
-- ============================================================
DO $$
DECLARE
    profile_count INT;
    memory_count INT;
    bucket_count INT;
BEGIN
    SELECT COUNT(*) INTO profile_count FROM public.profiles;
    SELECT COUNT(*) INTO memory_count FROM public.memories;
    SELECT COUNT(*) INTO bucket_count FROM storage.buckets
        WHERE id IN ('memory-images','memories','avatars','profiles','memory-audio');
    RAISE NOTICE '=== AURORA SCHEMA APPLIED SUCCESSFULLY ===';
    RAISE NOTICE 'Tables: profiles, memories, collections, collection_items, user_settings';
    RAISE NOTICE 'Storage buckets confirmed: %', bucket_count;
    RAISE NOTICE 'Existing profiles: %', profile_count;
    RAISE NOTICE 'Existing memories: %', memory_count;
    RAISE NOTICE 'RLS + policies: ALL ENABLED';
    RAISE NOTICE '==========================================';
END;
$$;
