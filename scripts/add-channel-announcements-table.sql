-- Dedicated channel announcements table (one row per channel)

CREATE TABLE IF NOT EXISTS public.channel_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT channel_announcements_channel_id_unique UNIQUE (channel_id),
  CONSTRAINT channel_announcements_title_length CHECK (char_length(title) BETWEEN 5 AND 200),
  CONSTRAINT channel_announcements_content_length CHECK (char_length(content) BETWEEN 10 AND 5000)
);

CREATE INDEX IF NOT EXISTS channel_announcements_channel_id_idx
  ON public.channel_announcements (channel_id);

CREATE OR REPLACE FUNCTION public.update_channel_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_channel_announcements_updated_at ON public.channel_announcements;

CREATE TRIGGER set_channel_announcements_updated_at
BEFORE UPDATE ON public.channel_announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_channel_announcements_updated_at();

ALTER TABLE public.channel_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view channel announcements" ON public.channel_announcements;
CREATE POLICY "Authenticated users can view channel announcements"
ON public.channel_announcements
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can create channel announcements" ON public.channel_announcements;
CREATE POLICY "Admins can create channel announcements"
ON public.channel_announcements
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'Admin'
  )
);

DROP POLICY IF EXISTS "Admins can update channel announcements" ON public.channel_announcements;
CREATE POLICY "Admins can update channel announcements"
ON public.channel_announcements
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'Admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'Admin'
  )
);
