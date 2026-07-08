-- Supersedes the WITH CHECK subquery approach in harden-self-update-rls.sql.
--
-- That approach referenced the policy's own table inside a WITH CHECK subquery
-- (e.g. SELECT approval_status FROM posts WHERE id = posts.id), which Postgres
-- rejects at runtime with "infinite recursion detected in policy for relation
-- ...". The effect was that EVERY owner UPDATE failed — attaching images to a
-- new post, editing profile flair, etc.
--
-- Correct approach: keep simple owner-only RLS policies, and enforce
-- privileged-column immutability with BEFORE UPDATE triggers. Triggers compare
-- OLD/NEW directly (no self-reference, no recursion). Trusted server code
-- (service_role) and admins are allowed through; normal clients are blocked
-- from changing the sensitive columns.

-- Simple owner-only policies (admins retain their separate "Admins can update"
-- policies).
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own posts" ON public.posts;
CREATE POLICY "Users can update own posts"
  ON public.posts
  FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- Column guards. current_user is the effective PostgREST role: anon/authenticated
-- for browser clients (guarded), service_role/postgres for trusted server code
-- (allowed). Admins are allowed via get_my_role().
CREATE OR REPLACE FUNCTION public.guard_profiles_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated')
     AND get_my_role() IS DISTINCT FROM 'Admin'::user_role THEN
    IF NEW.role           IS DISTINCT FROM OLD.role
       OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
       OR NEW.account_status IS DISTINCT FROM OLD.account_status THEN
      RAISE EXCEPTION 'Not permitted to modify role, is_verified, or account_status';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS guard_profiles_privileged_columns ON public.profiles;
CREATE TRIGGER guard_profiles_privileged_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profiles_privileged_columns();

CREATE OR REPLACE FUNCTION public.guard_posts_moderation_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated')
     AND get_my_role() IS DISTINCT FROM 'Admin'::user_role THEN
    IF NEW.approval_status IS DISTINCT FROM OLD.approval_status
       OR NEW.is_moderated IS DISTINCT FROM OLD.is_moderated THEN
      RAISE EXCEPTION 'Only admins may change post moderation status';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS guard_posts_moderation_columns ON public.posts;
CREATE TRIGGER guard_posts_moderation_columns
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.guard_posts_moderation_columns();
