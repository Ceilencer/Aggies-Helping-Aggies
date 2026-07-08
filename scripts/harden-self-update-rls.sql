-- Harden self-service UPDATE policies on profiles and posts.
--
-- Problem (privilege escalation):
--   The prior "Users can update own profile" / "Users can update own posts"
--   policies matched on the row owner but had NO column restriction. Because the
--   browser talks to PostgREST directly with the anon key, any authenticated user
--   could UPDATE their own row and set privileged columns — e.g.
--     update profiles set role = 'Admin', is_verified = true       -- become admin
--     update posts    set approval_status = 'approved'             -- skip moderation
--
-- Fix:
--   Recreate the owner UPDATE policies with a WITH CHECK that pins the sensitive
--   columns to their existing values (via a self-subquery, which sees the
--   pre-update row under MVCC). Non-owner columns (full_name, flair, images, …)
--   remain freely editable. Admins are unaffected: the separate
--   "Admins can update ..." policies still grant them full update rights.
--
-- Trusted server paths that legitimately change these columns were moved to the
-- service-role client (which bypasses RLS): the dashboard auto-unban and the
-- non-admin post-edit "pending_edit" flag.

-- ---------------------------------------------------------------- profiles ----
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role           = (SELECT p.role           FROM public.profiles p WHERE p.id = profiles.id)
    AND is_verified    = (SELECT p.is_verified    FROM public.profiles p WHERE p.id = profiles.id)
    AND account_status = (SELECT p.account_status FROM public.profiles p WHERE p.id = profiles.id)
  );

-- ------------------------------------------------------------------- posts ----
-- Drop both prior owner-update policies (there were two overlapping copies).
DROP POLICY IF EXISTS "Users can update own posts"       ON public.posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;

CREATE POLICY "Users can update own posts"
  ON public.posts
  FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (
    author_id = auth.uid()
    AND approval_status = (SELECT p.approval_status FROM public.posts p WHERE p.id = posts.id)
    AND is_moderated    = (SELECT p.is_moderated    FROM public.posts p WHERE p.id = posts.id)
  );
