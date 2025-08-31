-- Letify Auth Migration: profiles + users_integrations + RLS
-- Supabase SQL Editor'da çalıştırın

-- 1. profiles tablosu
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  status text NOT NULL DEFAULT 'pending_admin' 
    CHECK (status IN ('pending_admin', 'approved', 'denied')),
  role text NOT NULL DEFAULT 'agent',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. users_integrations tablosu  
CREATE TABLE IF NOT EXISTS public.users_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fb_page_id text,
  fb_access_token text,
  fb_app_secret text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- 3. updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_integrations_updated_at ON public.users_integrations;
CREATE TRIGGER update_users_integrations_updated_at
  BEFORE UPDATE ON public.users_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS politikaları
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_integrations ENABLE ROW LEVEL SECURITY;

-- profiles RLS: kullanıcı kendi satırını select/update, insert için auth.uid() = user_id
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- users_integrations RLS: ayrı politikalar (SELECT/INSERT/UPDATE/DELETE)
DROP POLICY IF EXISTS "ui_select" ON public.users_integrations;
CREATE POLICY "ui_select" ON public.users_integrations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ui_insert" ON public.users_integrations;
CREATE POLICY "ui_insert" ON public.users_integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ui_update" ON public.users_integrations;
CREATE POLICY "ui_update" ON public.users_integrations
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ui_delete" ON public.users_integrations;
CREATE POLICY "ui_delete" ON public.users_integrations
  FOR DELETE USING (auth.uid() = user_id);

-- 5. İndeksler
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS profiles_status_idx ON public.profiles(status);
CREATE INDEX IF NOT EXISTS users_integrations_user_id_idx ON public.users_integrations(user_id);

-- 6. Varsayılan profil satırı oluşturma fonksiyonu (opsiyonel)
-- Kayıt sonrası otomatik profile oluşturmak için kullanılabilir
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone, status, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'pending_admin', 
    'agent'
  );
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger'ı aktifleştir (otomatik profil oluşturma)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Mevcut profiles tablosuna alanları ekle (eğer tablo zaten varsa)
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone text;