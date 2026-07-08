-- Revoke EXECUTE on server-only SECURITY DEFINER functions from anon/authenticated.
--
-- Problem: these functions are SECURITY DEFINER (they run with the definer's
-- privileges and bypass RLS) yet were callable directly from the browser via
-- /rest/v1/rpc/<fn>. That let clients bypass server-side checks, e.g.:
--   - upsert_profile_on_login: mint an active+verified profile (self-approval)
--   - admin_reset_post_limits: reset anyone's rate-limit counters
--   - admin_delete_user / admin_get_*: invoke admin-only operations / read admin data
--
-- Every legitimate caller runs on the server through the service-role client
-- (service_role keeps EXECUTE), so revoking client roles closes the hole without
-- breaking any flow.
--
-- Intentionally NOT revoked:
--   - get_my_role()     : evaluated inside RLS policies as the authenticated role
--   - get_post_counts() : returns the caller's own post counts (self-service,
--                         called from the browser create-post form)

-- Revoke from PUBLIC as well as anon/authenticated: Postgres grants EXECUTE to
-- PUBLIC by default, and anon/authenticated inherit it — revoking only the named
-- roles leaves the function reachable through the PUBLIC grant.
REVOKE EXECUTE ON FUNCTION public.upsert_profile_on_login(uuid, text, text, text, account_status, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_reset_post_limits(uuid)          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_delete_user(uuid)                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_get_action_log(integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_get_daily_counts(integer)        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_get_snapshot()                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_post_decision_counts()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()                      FROM PUBLIC, anon, authenticated;
