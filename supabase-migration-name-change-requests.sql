-- Migration: name_change_requests
-- Run this in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.name_change_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_name   text NOT NULL,
  requested_name text NOT NULL,
  status         text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'denied')),
  reviewed_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at    timestamptz,
  reason         text,
  denial_reason  text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- One pending request per user at a time
CREATE UNIQUE INDEX IF NOT EXISTS name_change_requests_one_pending
  ON public.name_change_requests (user_id)
  WHERE status = 'pending';

-- RLS
ALTER TABLE public.name_change_requests ENABLE ROW LEVEL SECURITY;

-- Users can see their own requests
CREATE POLICY "Users can view own name change requests"
  ON public.name_change_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own requests
CREATE POLICY "Users can insert own name change requests"
  ON public.name_change_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all name change requests"
  ON public.name_change_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- Admins can update (approve/deny) requests
CREATE POLICY "Admins can update name change requests"
  ON public.name_change_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- Users can delete their own pending requests (cancel)
CREATE POLICY "Users can cancel own pending name change requests"
  ON public.name_change_requests FOR DELETE
  USING (auth.uid() = user_id AND status = 'pending');
-- Add reason column if table already exists (run if you already ran the original migration)
ALTER TABLE public.name_change_requests ADD COLUMN IF NOT EXISTS reason text;
