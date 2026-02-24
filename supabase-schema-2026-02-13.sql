-- =============================================
-- AGGIES HELPING AGGIES - SUPABASE SCHEMA SNAPSHOT
-- Source: Supabase production (public schema)
-- Date: 2026-02-13
-- =============================================

-- Required extensions
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ENUMS
-- =============================================

CREATE TYPE channel_type AS ENUM (
  'general',
  'jobs',
  'tickets',
  'promotions',
  'announcements',
  'aggie_ring'
);

CREATE TYPE user_role AS ENUM (
  'Personal',
  'Business',
  'Charity',
  'Admin'
);

CREATE TYPE verification_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);

-- =============================================
-- TABLES
-- =============================================

CREATE TABLE profiles (
  id UUID NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'Personal'::user_role,
  is_verified BOOLEAN DEFAULT false,
  is_alumni BOOLEAN DEFAULT false,
  mfa_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  graduation_year INTEGER,
  major TEXT,
  last_login TIMESTAMPTZ,
  avatar_url TEXT,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_email_key UNIQUE (email),
  CONSTRAINT email_domain_check CHECK (((email ~~ '%@tamu.edu'::text) OR (email ~~ '%@aggienetwork.com'::text) OR (is_alumni = true))),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE channels (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  type channel_type NOT NULL,
  requires_mfa BOOLEAN DEFAULT false,
  is_read_only BOOLEAN DEFAULT false,
  icon TEXT,
  color TEXT DEFAULT '#500000'::text,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT channels_pkey PRIMARY KEY (id),
  CONSTRAINT channels_name_key UNIQUE (name),
  CONSTRAINT channels_slug_key UNIQUE (slug)
);

CREATE TABLE posts (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL,
  author_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  images TEXT[],
  is_pinned BOOLEAN DEFAULT false,
  is_moderated BOOLEAN DEFAULT false,
  moderation_reason TEXT,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT posts_pkey PRIMARY KEY (id),
  CONSTRAINT title_length CHECK (((char_length(title) >= 5) AND (char_length(title) <= 200))),
  CONSTRAINT content_length CHECK (((char_length(content) >= 10) AND (char_length(content) <= 5000))),
  CONSTRAINT posts_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
  CONSTRAINT posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE comments (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_moderated BOOLEAN DEFAULT false,
  moderation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  parent_comment_id UUID,
  CONSTRAINT comments_pkey PRIMARY KEY (id),
  CONSTRAINT comment_length CHECK (((char_length(content) >= 1) AND (char_length(content) <= 1000))),
  CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE
);

CREATE TABLE comment_likes (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT comment_likes_pkey PRIMARY KEY (id),
  CONSTRAINT comment_likes_comment_id_user_id_key UNIQUE (comment_id, user_id),
  CONSTRAINT comment_likes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  CONSTRAINT comment_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE post_likes (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT post_likes_pkey PRIMARY KEY (id),
  CONSTRAINT post_likes_post_id_user_id_key UNIQUE (post_id, user_id),
  CONSTRAINT post_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT post_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE post_tracking (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  daily_post_count INTEGER DEFAULT 0,
  monthly_post_count INTEGER DEFAULT 0,
  last_daily_reset TIMESTAMPTZ DEFAULT now(),
  last_monthly_reset TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT post_tracking_pkey PRIMARY KEY (id),
  CONSTRAINT post_tracking_user_id_key UNIQUE (user_id),
  CONSTRAINT post_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE notifications (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE verification_requests (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  user_id UUID,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  graduation_year INTEGER NOT NULL,
  major TEXT NOT NULL,
  memorable_tradition TEXT NOT NULL,
  connection_to_tamu TEXT NOT NULL,
  status verification_status DEFAULT 'pending'::verification_status,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT verification_requests_pkey PRIMARY KEY (id),
  CONSTRAINT verification_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT verification_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES profiles(id)
);

-- =============================================
-- INDEXES
-- =============================================

CREATE UNIQUE INDEX channels_name_key ON public.channels USING btree (name);
CREATE UNIQUE INDEX channels_pkey ON public.channels USING btree (id);
CREATE UNIQUE INDEX channels_slug_key ON public.channels USING btree (slug);
CREATE UNIQUE INDEX comment_likes_comment_id_user_id_key ON public.comment_likes USING btree (comment_id, user_id);
CREATE UNIQUE INDEX comment_likes_pkey ON public.comment_likes USING btree (id);
CREATE INDEX idx_comment_likes_comment ON public.comment_likes USING btree (comment_id);
CREATE INDEX idx_comment_likes_user ON public.comment_likes USING btree (user_id);
CREATE UNIQUE INDEX comments_pkey ON public.comments USING btree (id);
CREATE INDEX idx_comments_parent ON public.comments USING btree (parent_comment_id);
CREATE INDEX idx_comments_post ON public.comments USING btree (post_id);
CREATE INDEX idx_notifications_unread ON public.notifications USING btree (user_id, is_read) WHERE (is_read = false);
CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id);
CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);
CREATE INDEX idx_post_likes_post ON public.post_likes USING btree (post_id);
CREATE INDEX idx_post_likes_user ON public.post_likes USING btree (user_id);
CREATE UNIQUE INDEX post_likes_pkey ON public.post_likes USING btree (id);
CREATE UNIQUE INDEX post_likes_post_id_user_id_key ON public.post_likes USING btree (post_id, user_id);
CREATE UNIQUE INDEX post_tracking_pkey ON public.post_tracking USING btree (id);
CREATE UNIQUE INDEX post_tracking_user_id_key ON public.post_tracking USING btree (user_id);
CREATE INDEX idx_posts_author ON public.posts USING btree (author_id);
CREATE INDEX idx_posts_channel ON public.posts USING btree (channel_id);
CREATE INDEX idx_posts_created ON public.posts USING btree (created_at DESC);
CREATE INDEX idx_posts_pinned ON public.posts USING btree (is_pinned) WHERE (is_pinned = true);
CREATE UNIQUE INDEX posts_pkey ON public.posts USING btree (id);
CREATE INDEX idx_profiles_email ON public.profiles USING btree (email);
CREATE INDEX idx_profiles_role ON public.profiles USING btree (role);
CREATE UNIQUE INDEX profiles_email_key ON public.profiles USING btree (email);
CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);
CREATE UNIQUE INDEX verification_requests_pkey ON public.verification_requests USING btree (id);

-- =============================================
-- FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION public.check_post_limit()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    user_role user_role;
    tracking_record RECORD;
    daily_limit INTEGER;
    monthly_limit INTEGER;
BEGIN
    -- Get user role
    SELECT role INTO user_role FROM profiles WHERE id = NEW.author_id;
    
    -- Set limits based on role
    CASE user_role
        WHEN 'Personal' THEN
            daily_limit := 2;
            monthly_limit := 60; -- 2/day * 30 days
        WHEN 'Charity' THEN
            daily_limit := 1;
            monthly_limit := 30;
        WHEN 'Business' THEN
            daily_limit := 0; -- No daily limit enforced separately
            monthly_limit := 1;
        WHEN 'Admin' THEN
            daily_limit := 999; -- Unlimited
            monthly_limit := 9999;
        ELSE
            daily_limit := 2;
            monthly_limit := 60;
    END CASE;
    
    -- Get or create tracking record
    INSERT INTO post_tracking (user_id, daily_post_count, monthly_post_count)
    VALUES (NEW.author_id, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    SELECT * INTO tracking_record FROM post_tracking WHERE user_id = NEW.author_id FOR UPDATE;
    
    -- Reset counters if needed
    IF tracking_record.last_daily_reset < CURRENT_DATE THEN
        UPDATE post_tracking 
        SET daily_post_count = 0, last_daily_reset = NOW()
        WHERE user_id = NEW.author_id;
        tracking_record.daily_post_count := 0;
    END IF;
    
    IF DATE_TRUNC('month', tracking_record.last_monthly_reset) < DATE_TRUNC('month', NOW()) THEN
        UPDATE post_tracking 
        SET monthly_post_count = 0, last_monthly_reset = NOW()
        WHERE user_id = NEW.author_id;
        tracking_record.monthly_post_count := 0;
    END IF;
    
    -- Check limits (Business accounts only check monthly)
    IF user_role = 'Business' THEN
        IF tracking_record.monthly_post_count >= monthly_limit THEN
            RAISE EXCEPTION 'Monthly post limit reached for Business accounts (% posts/month)', monthly_limit;
        END IF;
    ELSE
        IF tracking_record.daily_post_count >= daily_limit THEN
            RAISE EXCEPTION 'Daily post limit reached (% posts/day)', daily_limit;
        END IF;
        
        IF tracking_record.monthly_post_count >= monthly_limit THEN
            RAISE EXCEPTION 'Monthly post limit reached (% posts/month)', monthly_limit;
        END IF;
    END IF;
    
    -- Increment counters
    UPDATE post_tracking 
    SET 
        daily_post_count = daily_post_count + 1,
        monthly_post_count = monthly_post_count + 1
    WHERE user_id = NEW.author_id;
    
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_old_posts()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  DELETE FROM posts
  WHERE created_at < NOW() - INTERVAL '14 days';
END;
$function$;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

-- =============================================
-- TRIGGERS
-- =============================================

CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER enforce_post_limits
  BEFORE INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.check_post_limit();

CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER verification_requests_updated_at
  BEFORE UPDATE ON public.verification_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLICIES
-- =============================================

CREATE POLICY "Channels are viewable by all authenticated users"
  ON public.channels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Comment likes are viewable by verified users"
  ON public.comment_likes FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_verified = true)))));

CREATE POLICY "Users can unlike their own comment likes"
  ON public.comment_likes FOR DELETE
  TO authenticated
  USING ((user_id = auth.uid()));

CREATE POLICY "Verified users can like comments"
  ON public.comment_likes FOR INSERT
  TO authenticated
  WITH CHECK (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_verified = true))))));

CREATE POLICY "Comments are viewable by verified users"
  ON public.comments FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_verified = true)))));

CREATE POLICY "Users can delete own comments"
  ON public.comments FOR DELETE
  TO authenticated
  USING ((author_id = auth.uid()));

CREATE POLICY "Admins can delete any comment"
  ON public.comments FOR DELETE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'Admin'::user_role)))));

CREATE POLICY "Users can update own comments"
  ON public.comments FOR UPDATE
  TO authenticated
  USING ((author_id = auth.uid()));

CREATE POLICY "Verified users can create comments"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (((author_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_verified = true))))));

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING ((user_id = auth.uid()));

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING ((user_id = auth.uid()));

CREATE POLICY "Post likes are viewable by verified users"
  ON public.post_likes FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_verified = true)))));

CREATE POLICY "Users can unlike their own post likes"
  ON public.post_likes FOR DELETE
  TO authenticated
  USING ((user_id = auth.uid()));

CREATE POLICY "Verified users can like posts"
  ON public.post_likes FOR INSERT
  TO authenticated
  WITH CHECK (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_verified = true))))));

CREATE POLICY "Users can insert own post tracking"
  ON public.post_tracking FOR INSERT
  TO authenticated
  WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "Users can update own post tracking"
  ON public.post_tracking FOR UPDATE
  TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "Users can view own post tracking"
  ON public.post_tracking FOR SELECT
  TO authenticated
  USING ((user_id = auth.uid()));

CREATE POLICY "Admins can update any post"
  ON public.posts FOR UPDATE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'Admin'::user_role)))));

CREATE POLICY "Admins can delete any post"
  ON public.posts FOR DELETE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'Admin'::user_role)))));

CREATE POLICY "Posts are viewable by verified users"
  ON public.posts FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_verified = true)))));

CREATE POLICY "Users can delete own posts"
  ON public.posts FOR DELETE
  TO authenticated
  USING ((author_id = auth.uid()));

CREATE POLICY "Users can update own posts"
  ON public.posts FOR UPDATE
  TO authenticated
  USING ((author_id = auth.uid()));

CREATE POLICY "Users can update their own posts"
  ON public.posts FOR UPDATE
  TO public
  USING ((auth.uid() = author_id))
  WITH CHECK ((auth.uid() = author_id));

CREATE POLICY "Verified users can create posts"
  ON public.posts FOR INSERT
  TO authenticated
  WITH CHECK (((author_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_verified = true))))));

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING ((auth.uid() = id));

CREATE POLICY "Verified profiles are viewable by all authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING ((is_verified = true));

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() = id));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((auth.uid() = id));

CREATE POLICY "Admins can update verification requests"
  ON public.verification_requests FOR UPDATE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'Admin'::user_role)))));

CREATE POLICY "Admins can view all verification requests"
  ON public.verification_requests FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'Admin'::user_role)))));

CREATE POLICY "Users can create verification requests"
  ON public.verification_requests FOR INSERT
  TO authenticated
  WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "Users can view own verification requests"
  ON public.verification_requests FOR SELECT
  TO authenticated
  USING ((user_id = auth.uid()));
