-- ==============================================================================
-- AURORA MEMORY VAULT — PRODUCTION HARDENING MIGRATION
-- Phase 1: User Data Isolation + Storage RLS + Last Login Trigger
-- Execute in Supabase SQL Editor: https://supabase.com/dashboard
-- ==============================================================================

-- ============================================================
-- PART 1: STORAGE BUCKET RLS POLICIES
-- Ensures each user can ONLY access files under their own
-- user_id/ prefix. No cross-user access ever.
-- ============================================================

-- Policy helper: storage path must start with the authenticated user's UUID
-- This is enforced for ALL storage buckets.

-- MEMORY-IMAGES bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('memory-images', 'memory-images', false, 52428800, ARRAY['image/*'])
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Users upload own memory images" ON storage.objects;
CREATE POLICY "Users upload own memory images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'memory-images'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

DROP POLICY IF EXISTS "Users read own memory images" ON storage.objects;
CREATE POLICY "Users read own memory images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'memory-images'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

DROP POLICY IF EXISTS "Users delete own memory images" ON storage.objects;
CREATE POLICY "Users delete own memory images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'memory-images'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

DROP POLICY IF EXISTS "Users update own memory images" ON storage.objects;
CREATE POLICY "Users update own memory images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'memory-images'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- MEMORIES bucket (general)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('memories', 'memories', false, 104857600, ARRAY['image/*', 'video/*', 'audio/*'])
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Users upload own memories files" ON storage.objects;
CREATE POLICY "Users upload own memories files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'memories'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

DROP POLICY IF EXISTS "Users read own memories files" ON storage.objects;
CREATE POLICY "Users read own memories files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'memories'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

DROP POLICY IF EXISTS "Users delete own memories files" ON storage.objects;
CREATE POLICY "Users delete own memories files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'memories'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- AVATARS bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', false, 10485760, ARRAY['image/*'])
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
CREATE POLICY "Users upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

DROP POLICY IF EXISTS "Users read own avatar" ON storage.objects;
CREATE POLICY "Users read own avatar"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
CREATE POLICY "Users update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;
CREATE POLICY "Users delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );


-- ============================================================
-- PART 2: REAL LAST_LOGIN TRIGGER
-- Updates profiles.last_login on every successful sign-in.
-- This is the authoritative source for Last Login display.
-- ============================================================

-- Function: update last_login timestamp on every auth sign-in
CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET last_login = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: fires on every row update in auth.sessions (each login creates/updates a session)
-- Note: Supabase fires on_auth_user_login when a session is created
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION public.handle_user_login();

-- Also update the handle_new_user trigger to set last_login on new signups
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
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        last_login = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- PART 3: VERIFY ALL TABLE RLS IS ENABLED
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Re-confirm profile policies are correct
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Re-confirm memories policies
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

-- Confirm no anonymous access exists anywhere
-- (All policies above use auth.uid() which returns NULL for anonymous users,
--  causing all comparisons to fail = zero anonymous access)
