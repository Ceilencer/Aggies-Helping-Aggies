-- Storage + function-hardening pass (Supabase security advisors).

-- M4 — Public bucket allows listing.
-- The "Anyone can view images" SELECT policy on storage.objects let any client
-- enumerate every file in the public post-images bucket via the storage API.
-- Image display uses public CDN URLs (getPublicUrl), which do NOT go through
-- RLS on a public bucket, and the only .list() call (deletePostImages) runs with
-- the service-role client, which bypasses RLS. So the policy is unnecessary for
-- normal operation and is dropped to remove the enumeration surface.
DROP POLICY IF EXISTS "Anyone can view images" ON storage.objects;

-- N2 — Function search_path mutable.
-- Pin search_path so these functions can't be hijacked via a mutable search_path.
-- All reference public-schema tables, so a fixed public search_path preserves
-- behavior.
ALTER FUNCTION public.check_post_limit() SET search_path = public;
ALTER FUNCTION public.deactivate_expired_bans() SET search_path = public;
ALTER FUNCTION public.increment_post_decision_counts() SET search_path = public;
ALTER FUNCTION public.is_user_banned(p_user_id uuid) SET search_path = public;
ALTER FUNCTION public.update_channel_announcements_updated_at() SET search_path = public;
ALTER FUNCTION public.update_comment_count() SET search_path = public;
ALTER FUNCTION public.update_comment_likes_count() SET search_path = public;
ALTER FUNCTION public.update_likes_count() SET search_path = public;
ALTER FUNCTION public.update_updated_at() SET search_path = public;
ALTER FUNCTION public.update_user_bans_updated_at() SET search_path = public;
