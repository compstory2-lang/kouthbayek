-- =====================================================================
-- خوذ بايك (Khouz Bayek) — قاعدة بيانات Supabase الكاملة (v1.0-TN)
-- شغّل هذا الملف مرة واحدة في Supabase -> SQL Editor -> Run
-- =====================================================================

-- 1) جدول عروض السوق اليومي (صالحة 24 ساعة)
CREATE TABLE IF NOT EXISTS public.kb_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price > 0),
  category text NOT NULL,
  governorate text NOT NULL DEFAULT 'قابس',
  seller_name text NOT NULL,
  phone text NOT NULL,
  lat double precision,
  lng double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

-- 2) جدول الحرفيين والورشات
CREATE TABLE IF NOT EXISTS public.kb_craftsmen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  specialty text NOT NULL,
  governorate text NOT NULL DEFAULT 'قابس',
  area text,
  phone text NOT NULL,
  description text,
  rating numeric(2,1) NOT NULL DEFAULT 5.0,
  reviews_count integer NOT NULL DEFAULT 1,
  lat double precision,
  lng double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3) جدول بلاغات الطوارئ 24/24
CREATE TABLE IF NOT EXISTS public.kb_emergencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  emergency_type text NOT NULL,
  governorate text NOT NULL DEFAULT 'قابس',
  description text NOT NULL,
  phone text,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4) تفعيل RLS وسياسات القراءة والإضافة للمرحلة الأولى
ALTER TABLE public.kb_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_craftsmen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_emergencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kb_offers_public_read" ON public.kb_offers;
CREATE POLICY "kb_offers_public_read" ON public.kb_offers FOR SELECT USING (expires_at > now());

DROP POLICY IF EXISTS "kb_offers_public_insert" ON public.kb_offers;
CREATE POLICY "kb_offers_public_insert" ON public.kb_offers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "kb_craftsmen_public_read" ON public.kb_craftsmen;
CREATE POLICY "kb_craftsmen_public_read" ON public.kb_craftsmen FOR SELECT USING (true);

DROP POLICY IF EXISTS "kb_craftsmen_public_insert" ON public.kb_craftsmen;
CREATE POLICY "kb_craftsmen_public_insert" ON public.kb_craftsmen FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "kb_emergencies_public_read" ON public.kb_emergencies;
CREATE POLICY "kb_emergencies_public_read" ON public.kb_emergencies FOR SELECT USING (status = 'open');

DROP POLICY IF EXISTS "kb_emergencies_public_insert" ON public.kb_emergencies;
CREATE POLICY "kb_emergencies_public_insert" ON public.kb_emergencies FOR INSERT WITH CHECK (true);

-- 5) جدولة حذف العروض المنتهية بعد 24 ساعة تلقائياً كل ساعة عبر pg_cron
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'kb-cleanup-expired-offers';
    PERFORM cron.schedule(
      'kb-cleanup-expired-offers',
      '0 * * * *',
      $cron$DELETE FROM public.kb_offers WHERE expires_at < now();$cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron skipped: %', SQLERRM;
END $$;
