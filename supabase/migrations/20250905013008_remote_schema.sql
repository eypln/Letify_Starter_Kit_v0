

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "wrappers" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."enqueue_on_confirm"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if new.email_confirmed_at is not null
     and (old.email_confirmed_at is distinct from new.email_confirmed_at) then
    insert into public.approval_queue (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end $$;


ALTER FUNCTION "public"."enqueue_on_confirm"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles (user_id, full_name, phone, role, status)
  values (
    new.id,
    nullif(coalesce(new.raw_user_meta_data->>'full_name',''), ''),
    nullif(coalesce(new.raw_user_meta_data->>'phone',''), ''),
    'agent',
    'pending_admin'
  )
  on conflict (user_id) do nothing;

  -- ✅ Kuyruğa düşür
  insert into public.approval_queue (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end $$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_credits"("p_user_id" "uuid", "p_delta" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.billing_customers (user_id, credits)
  values (p_user_id, p_delta)
  on conflict (user_id) 
  do update set 
    credits = billing_customers.credits + p_delta,
    updated_at = now();
end; $$;


ALTER FUNCTION "public"."increment_credits"("p_user_id" "uuid", "p_delta" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."noop"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- do nothing
end; $$;


ALTER FUNCTION "public"."noop"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at_billing"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  NEW.updated_at = now();
  return NEW;
end; $$;


ALTER FUNCTION "public"."set_updated_at_billing"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."analytics_events" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "event_type" "text" NOT NULL,
    "platform" "text",
    "listing_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."analytics_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."approval_queue" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text",
    "admin_notes" "text",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "approval_queue_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."approval_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_credit_ledger" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "delta" integer NOT NULL,
    "reason" "text" NOT NULL,
    "stripe_payment_intent_id" "text",
    "stripe_invoice_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."billing_credit_ledger" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "stripe_customer_id" "text" NOT NULL,
    "credits" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."billing_customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "stripe_payment_intent_id" "text" NOT NULL,
    "amount_cents" integer NOT NULL,
    "currency" "text" DEFAULT 'eur'::"text" NOT NULL,
    "status" "text" NOT NULL,
    "credit_amount" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "billing_payments_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'succeeded'::"text", 'failed'::"text", 'canceled'::"text"])))
);


ALTER TABLE "public"."billing_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "stripe_subscription_id" "text" NOT NULL,
    "stripe_customer_id" "text" NOT NULL,
    "status" "text" NOT NULL,
    "current_period_start" timestamp with time zone NOT NULL,
    "current_period_end" timestamp with time zone NOT NULL,
    "cancel_at_period_end" boolean DEFAULT false NOT NULL,
    "plan_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "billing_cycle" "text" DEFAULT 'monthly'::"text" NOT NULL,
    CONSTRAINT "billing_subscriptions_billing_cycle_check" CHECK (("billing_cycle" = ANY (ARRAY['monthly'::"text", 'yearly'::"text"]))),
    CONSTRAINT "billing_subscriptions_plan_type_check" CHECK (("plan_type" = ANY (ARRAY['mini'::"text", 'full'::"text"]))),
    CONSTRAINT "billing_subscriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'past_due'::"text", 'canceled'::"text", 'incomplete'::"text", 'trialing'::"text", 'unpaid'::"text"])))
);


ALTER TABLE "public"."billing_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."credit_transactions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "amount" integer NOT NULL,
    "type" "text" NOT NULL,
    "description" "text",
    "stripe_payment_intent_id" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "credit_transactions_type_check" CHECK (("type" = ANY (ARRAY['purchase'::"text", 'usage'::"text", 'refund'::"text", 'bonus'::"text"])))
);


ALTER TABLE "public"."credit_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "listing_id" "text",
    "kind" "text" NOT NULL,
    "status" "text" DEFAULT 'queued'::"text" NOT NULL,
    "progress_int" integer DEFAULT 0,
    "payload" "jsonb",
    "result" "jsonb",
    "error_msg" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "jobs_kind_check" CHECK (("kind" = ANY (ARRAY['content'::"text", 'post'::"text", 'video'::"text", 'reels_post'::"text"]))),
    CONSTRAINT "jobs_status_check" CHECK (("status" = ANY (ARRAY['queued'::"text", 'running'::"text", 'done'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."jobs" OWNER TO "postgres";


COMMENT ON TABLE "public"."jobs" IS 'n8n webhook işlerinin takibi ve durumu';



CREATE TABLE IF NOT EXISTS "public"."listings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "property_url" "text" NOT NULL,
    "title" "text",
    "description" "text",
    "price" numeric(12,2),
    "location" "text",
    "city" "text",
    "bedrooms" integer,
    "bathrooms" integer,
    "area_sqm" integer,
    "images" "jsonb" DEFAULT '[]'::"jsonb",
    "facebook_post_url" "text",
    "facebook_reel_url" "text",
    "instagram_post_url" "text",
    "instagram_reel_url" "text",
    "tiktok_url" "text",
    "video_url" "text",
    "video_template" "text",
    "status" "text" DEFAULT 'draft'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "listings_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'processing'::"text", 'published'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."listings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "user_id" "uuid" NOT NULL,
    "full_name" "text",
    "phone" "text",
    "company" "text",
    "is_approved" boolean DEFAULT false,
    "subscription_tier" "text" DEFAULT 'free'::"text",
    "subscription_status" "text" DEFAULT 'inactive'::"text",
    "stripe_customer_id" "text",
    "credits" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'pending_admin'::"text" NOT NULL,
    "role" "text" DEFAULT 'agent'::"text" NOT NULL,
    CONSTRAINT "profiles_status_check" CHECK (("status" = ANY (ARRAY['pending_admin'::"text", 'approved'::"text", 'denied'::"text"]))),
    CONSTRAINT "profiles_subscription_tier_check" CHECK (("subscription_tier" = ANY (ARRAY['free'::"text", 'mini'::"text", 'full'::"text", 'enterprise'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."uploaded_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "job_id" "uuid" NOT NULL,
    "storage_path" "text" NOT NULL,
    "public_url" "text" NOT NULL,
    "size_bytes" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."uploaded_assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_api_keys" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "platform" "text" NOT NULL,
    "api_key" "text",
    "page_id" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_api_keys_platform_check" CHECK (("platform" = ANY (ARRAY['facebook'::"text", 'instagram'::"text", 'tiktok'::"text", 'whatsapp'::"text"])))
);


ALTER TABLE "public"."user_api_keys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users_integrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "fb_page_id" "text",
    "fb_access_token" "text",
    "fb_app_secret" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."users_integrations" OWNER TO "postgres";


ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."approval_queue"
    ADD CONSTRAINT "approval_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_credit_ledger"
    ADD CONSTRAINT "billing_credit_ledger_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_customers"
    ADD CONSTRAINT "billing_customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_customers"
    ADD CONSTRAINT "billing_customers_stripe_customer_id_key" UNIQUE ("stripe_customer_id");



ALTER TABLE ONLY "public"."billing_payments"
    ADD CONSTRAINT "billing_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_payments"
    ADD CONSTRAINT "billing_payments_stripe_payment_intent_id_key" UNIQUE ("stripe_payment_intent_id");



ALTER TABLE ONLY "public"."billing_subscriptions"
    ADD CONSTRAINT "billing_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_subscriptions"
    ADD CONSTRAINT "billing_subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."credit_transactions"
    ADD CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."listings"
    ADD CONSTRAINT "listings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."billing_customers"
    ADD CONSTRAINT "unique_user_billing" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."uploaded_assets"
    ADD CONSTRAINT "uploaded_assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_api_keys"
    ADD CONSTRAINT "user_api_keys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users_integrations"
    ADD CONSTRAINT "users_integrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users_integrations"
    ADD CONSTRAINT "users_integrations_user_id_key" UNIQUE ("user_id");



CREATE INDEX "idx_analytics_created_at" ON "public"."analytics_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_analytics_user_id" ON "public"."analytics_events" USING "btree" ("user_id");



CREATE INDEX "idx_approval_queue_status" ON "public"."approval_queue" USING "btree" ("status");



CREATE INDEX "idx_billing_customers_customer" ON "public"."billing_customers" USING "btree" ("stripe_customer_id");



CREATE INDEX "idx_billing_customers_user" ON "public"."billing_customers" USING "btree" ("user_id");



CREATE INDEX "idx_credit_ledger_user" ON "public"."billing_credit_ledger" USING "btree" ("user_id");



CREATE INDEX "idx_credit_transactions_user_id" ON "public"."credit_transactions" USING "btree" ("user_id");



CREATE INDEX "idx_listings_created_at" ON "public"."listings" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_listings_status" ON "public"."listings" USING "btree" ("status");



CREATE INDEX "idx_listings_user_id" ON "public"."listings" USING "btree" ("user_id");



CREATE INDEX "jobs_created_at_idx" ON "public"."jobs" USING "btree" ("created_at");



CREATE INDEX "jobs_kind_idx" ON "public"."jobs" USING "btree" ("kind");



CREATE INDEX "jobs_status_idx" ON "public"."jobs" USING "btree" ("status");



CREATE INDEX "jobs_user_id_idx" ON "public"."jobs" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "trg_billing_customers_updated" BEFORE UPDATE ON "public"."billing_customers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_billing"();



CREATE OR REPLACE TRIGGER "trg_billing_payments_updated" BEFORE UPDATE ON "public"."billing_payments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_billing"();



CREATE OR REPLACE TRIGGER "trg_billing_subscriptions_updated" BEFORE UPDATE ON "public"."billing_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_billing"();



CREATE OR REPLACE TRIGGER "trg_profiles_updated" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_users_integrations_updated" BEFORE UPDATE ON "public"."users_integrations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_jobs_updated_at" BEFORE UPDATE ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_listings_updated_at" BEFORE UPDATE ON "public"."listings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."approval_queue"
    ADD CONSTRAINT "approval_queue_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_credit_ledger"
    ADD CONSTRAINT "billing_credit_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_customers"
    ADD CONSTRAINT "billing_customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_payments"
    ADD CONSTRAINT "billing_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_subscriptions"
    ADD CONSTRAINT "billing_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."credit_transactions"
    ADD CONSTRAINT "credit_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."listings"
    ADD CONSTRAINT "listings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."uploaded_assets"
    ADD CONSTRAINT "uploaded_assets_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."uploaded_assets"
    ADD CONSTRAINT "uploaded_assets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_api_keys"
    ADD CONSTRAINT "user_api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users_integrations"
    ADD CONSTRAINT "users_integrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Users can create analytics events" ON "public"."analytics_events" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create own listings" ON "public"."listings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own jobs" ON "public"."jobs" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own listings" ON "public"."listings" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own jobs" ON "public"."jobs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own API keys" ON "public"."user_api_keys" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own jobs" ON "public"."jobs" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own listings" ON "public"."listings" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own analytics" ON "public"."analytics_events" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own jobs" ON "public"."jobs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own listings" ON "public"."listings" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own transactions" ON "public"."credit_transactions" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."analytics_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."approval_queue" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "aq_self_select" ON "public"."approval_queue" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."billing_credit_ledger" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "billing_credit_ledger_own_insert" ON "public"."billing_credit_ledger" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "billing_credit_ledger_own_select" ON "public"."billing_credit_ledger" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."billing_customers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "billing_customers_own_insert" ON "public"."billing_customers" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "billing_customers_own_select" ON "public"."billing_customers" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "billing_customers_own_update" ON "public"."billing_customers" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."billing_payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "billing_payments_own_insert" ON "public"."billing_payments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "billing_payments_own_select" ON "public"."billing_payments" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "billing_payments_own_update" ON "public"."billing_payments" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."billing_subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "billing_subscriptions_own_insert" ON "public"."billing_subscriptions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "billing_subscriptions_own_select" ON "public"."billing_subscriptions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "billing_subscriptions_own_update" ON "public"."billing_subscriptions" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."credit_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."jobs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "jobs_insert_own" ON "public"."jobs" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "jobs_select_own" ON "public"."jobs" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."listings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "own rows" ON "public"."uploaded_assets" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "profiles_select" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "profiles_update" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "ui_delete" ON "public"."users_integrations" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "ui_insert" ON "public"."users_integrations" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "ui_select" ON "public"."users_integrations" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "ui_select_own" ON "public"."users_integrations" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "ui_update" ON "public"."users_integrations" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."uploaded_assets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_api_keys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users_integrations" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
































































































































































































































































































GRANT ALL ON FUNCTION "public"."enqueue_on_confirm"() TO "anon";
GRANT ALL ON FUNCTION "public"."enqueue_on_confirm"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enqueue_on_confirm"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_credits"("p_user_id" "uuid", "p_delta" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_credits"("p_user_id" "uuid", "p_delta" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_credits"("p_user_id" "uuid", "p_delta" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."noop"() TO "anon";
GRANT ALL ON FUNCTION "public"."noop"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."noop"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at_billing"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at_billing"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at_billing"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";





















GRANT ALL ON TABLE "public"."analytics_events" TO "anon";
GRANT ALL ON TABLE "public"."analytics_events" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_events" TO "service_role";



GRANT ALL ON TABLE "public"."approval_queue" TO "anon";
GRANT ALL ON TABLE "public"."approval_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."approval_queue" TO "service_role";



GRANT ALL ON TABLE "public"."billing_credit_ledger" TO "anon";
GRANT ALL ON TABLE "public"."billing_credit_ledger" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_credit_ledger" TO "service_role";



GRANT ALL ON TABLE "public"."billing_customers" TO "anon";
GRANT ALL ON TABLE "public"."billing_customers" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_customers" TO "service_role";



GRANT ALL ON TABLE "public"."billing_payments" TO "anon";
GRANT ALL ON TABLE "public"."billing_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_payments" TO "service_role";



GRANT ALL ON TABLE "public"."billing_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."billing_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."credit_transactions" TO "anon";
GRANT ALL ON TABLE "public"."credit_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."credit_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."jobs" TO "anon";
GRANT ALL ON TABLE "public"."jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."jobs" TO "service_role";



GRANT ALL ON TABLE "public"."listings" TO "anon";
GRANT ALL ON TABLE "public"."listings" TO "authenticated";
GRANT ALL ON TABLE "public"."listings" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."uploaded_assets" TO "anon";
GRANT ALL ON TABLE "public"."uploaded_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."uploaded_assets" TO "service_role";



GRANT ALL ON TABLE "public"."user_api_keys" TO "anon";
GRANT ALL ON TABLE "public"."user_api_keys" TO "authenticated";
GRANT ALL ON TABLE "public"."user_api_keys" TO "service_role";



GRANT ALL ON TABLE "public"."users_integrations" TO "anon";
GRANT ALL ON TABLE "public"."users_integrations" TO "authenticated";
GRANT ALL ON TABLE "public"."users_integrations" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
