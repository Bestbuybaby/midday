-- Midday Initial Migration (FIXED)
-- Generated from schema.ts with corrected constraints

-- =============================================
-- EXTENSIONS (required for vector similarity and text search)
-- =============================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================
-- ENUMS
-- =============================================

CREATE TYPE "account_type" AS ENUM('depository', 'credit', 'other_asset', 'loan', 'other_liability');
CREATE TYPE "activity_source" AS ENUM('system', 'user');
CREATE TYPE "activity_status" AS ENUM('unread', 'read', 'archived');
CREATE TYPE "activity_type" AS ENUM('transactions_enriched', 'transactions_created', 'invoice_paid', 'inbox_new', 'inbox_auto_matched', 'inbox_needs_review', 'inbox_cross_currency_matched', 'invoice_overdue', 'invoice_sent', 'inbox_match_confirmed', 'document_uploaded', 'document_processed', 'invoice_duplicated', 'invoice_scheduled', 'invoice_reminder_sent', 'invoice_cancelled', 'invoice_created', 'draft_invoice_created', 'tracker_entry_created', 'tracker_project_created', 'transactions_categorized', 'transactions_assigned', 'transaction_attachment_created', 'transaction_category_created', 'transactions_exported', 'customer_created');
CREATE TYPE "bank_providers" AS ENUM('gocardless', 'plaid', 'teller', 'enablebanking');
CREATE TYPE "connection_status" AS ENUM('disconnected', 'connected', 'unknown');
CREATE TYPE "document_processing_status" AS ENUM('pending', 'processing', 'completed', 'failed');
CREATE TYPE "inbox_account_providers" AS ENUM('gmail', 'outlook');
CREATE TYPE "inbox_account_status" AS ENUM('connected', 'disconnected');
CREATE TYPE "inbox_blocklist_type" AS ENUM('email', 'domain');
CREATE TYPE "inbox_status" AS ENUM('processing', 'pending', 'archived', 'new', 'analyzing', 'suggested_match', 'no_match', 'done', 'deleted');
CREATE TYPE "inbox_type" AS ENUM('invoice', 'expense');
CREATE TYPE "invoice_delivery_type" AS ENUM('create', 'create_and_send', 'scheduled');
CREATE TYPE "invoice_size" AS ENUM('a4', 'letter');
CREATE TYPE "invoice_status" AS ENUM('draft', 'overdue', 'paid', 'unpaid', 'canceled', 'scheduled');
CREATE TYPE "plans" AS ENUM('trial', 'starter', 'pro');
CREATE TYPE "reportTypes" AS ENUM('profit', 'revenue', 'burn_rate', 'expense', 'monthly_revenue', 'revenue_forecast', 'runway', 'category_expenses');
CREATE TYPE "subscription_status" AS ENUM('active', 'canceled', 'past_due', 'unpaid', 'trialing', 'incomplete', 'incomplete_expired');
CREATE TYPE "teamRoles" AS ENUM('owner', 'member');
CREATE TYPE "trackerStatus" AS ENUM('in_progress', 'completed');
CREATE TYPE "transaction_frequency" AS ENUM('weekly', 'biweekly', 'monthly', 'semi_monthly', 'annually', 'irregular', 'unknown');
CREATE TYPE "transactionMethods" AS ENUM('payment', 'card_purchase', 'card_atm', 'transfer', 'other', 'unknown', 'ach', 'interest', 'deposit', 'wire', 'fee');
CREATE TYPE "transactionStatus" AS ENUM('posted', 'pending', 'excluded', 'completed', 'archived');

-- =============================================
-- HELPER FUNCTIONS (must be created before tables that use them)
-- =============================================

-- Function to generate inbox FTS (referenced by inbox table)
CREATE OR REPLACE FUNCTION generate_inbox_fts(display_name text, product_names text)
RETURNS tsvector AS $$
BEGIN
  RETURN to_tsvector('english', COALESCE(display_name, '') || ' ' || COALESCE(product_names, ''));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to extract product names from JSON
CREATE OR REPLACE FUNCTION extract_product_names(products json)
RETURNS text AS $$
BEGIN
  IF products IS NULL THEN
    RETURN '';
  END IF;
  RETURN COALESCE(
    (SELECT string_agg(elem->>'name', ' ') FROM json_array_elements(products) AS elem),
    ''
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to generate inbox ID
CREATE OR REPLACE FUNCTION generate_inbox(length integer)
RETURNS text AS $$
DECLARE
  chars text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- PRIVATE SCHEMA & RLS HELPER FUNCTION
-- =============================================

CREATE SCHEMA IF NOT EXISTS private;

-- This function is referenced by RLS policies
CREATE OR REPLACE FUNCTION private.get_teams_for_authenticated_user()
RETURNS SETOF uuid AS $$
BEGIN
  RETURN QUERY
  SELECT team_id FROM users_on_team WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================
-- TABLES (ordered by dependencies)
-- =============================================

-- Teams table (referenced by many other tables)
CREATE TABLE IF NOT EXISTS "teams" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "name" text,
  "logo_url" text,
  "inbox_id" text DEFAULT generate_inbox(10),
  "email" text,
  "inbox_email" text,
  "inbox_forwarding" boolean DEFAULT true,
  "base_currency" text,
  "country_code" text,
  "fiscal_year_start_month" smallint,
  "document_classification" boolean DEFAULT false,
  "flags" text[],
  "canceled_at" timestamp with time zone,
  "plan" "plans" DEFAULT 'trial' NOT NULL,
  "export_settings" jsonb,
  CONSTRAINT "teams_inbox_id_key" UNIQUE("inbox_id")
);

-- Users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY NOT NULL,
  "full_name" text,
  "avatar_url" text,
  "email" text,
  "team_id" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "locale" text DEFAULT 'en',
  "week_starts_on_monday" boolean DEFAULT false,
  "timezone" text,
  "timezone_auto_sync" boolean DEFAULT true,
  "time_format" numeric DEFAULT 24,
  "date_format" text,
  CONSTRAINT "users_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL
);

CREATE INDEX "users_team_id_idx" ON "users" USING btree ("team_id");

-- Users on team (many-to-many)
CREATE TABLE IF NOT EXISTS "users_on_team" (
  "user_id" uuid NOT NULL,
  "team_id" uuid NOT NULL,
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "role" "teamRoles",
  "created_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("user_id", "team_id", "id"),
  CONSTRAINT "users_on_team_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "users_on_team_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX "users_on_team_team_id_idx" ON "users_on_team" USING btree ("team_id");
CREATE INDEX "users_on_team_user_id_idx" ON "users_on_team" USING btree ("user_id");

-- Bank connections
CREATE TABLE IF NOT EXISTS "bank_connections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "institution_id" text NOT NULL,
  "expires_at" timestamp with time zone,
  "team_id" uuid NOT NULL,
  "name" text NOT NULL,
  "logo_url" text,
  "access_token" text,
  "enrollment_id" text,
  "provider" "bank_providers" NOT NULL,
  "last_accessed" timestamp with time zone,
  "reference_id" text,
  "status" "connection_status" DEFAULT 'connected',
  "error_details" text,
  "error_retries" smallint DEFAULT 0,
  CONSTRAINT "bank_connections_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
  CONSTRAINT "unique_bank_connections" UNIQUE("institution_id", "team_id")
);

CREATE INDEX "bank_connections_team_id_idx" ON "bank_connections" USING btree ("team_id");

-- Bank accounts
CREATE TABLE IF NOT EXISTS "bank_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL,
  "team_id" uuid NOT NULL,
  "name" text,
  "currency" text,
  "bank_connection_id" uuid,
  "enabled" boolean DEFAULT true NOT NULL,
  "account_id" text NOT NULL,
  "balance" numeric(10, 2) DEFAULT 0,
  "manual" boolean DEFAULT false,
  "type" "account_type",
  "base_currency" text,
  "base_balance" numeric(10, 2),
  "error_details" text,
  "error_retries" smallint,
  "account_reference" text,
  CONSTRAINT "bank_accounts_bank_connection_id_fkey" FOREIGN KEY ("bank_connection_id") REFERENCES "bank_connections"("id") ON DELETE CASCADE,
  CONSTRAINT "bank_accounts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "public_bank_accounts_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE
);

CREATE INDEX "bank_accounts_bank_connection_id_idx" ON "bank_accounts" USING btree ("bank_connection_id");
CREATE INDEX "bank_accounts_created_by_idx" ON "bank_accounts" USING btree ("created_by");
CREATE INDEX "bank_accounts_team_id_idx" ON "bank_accounts" USING btree ("team_id");

-- Transaction categories (FIXED: added UNIQUE constraint on id for self-referential FK)
CREATE TABLE IF NOT EXISTS "transaction_categories" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "team_id" uuid NOT NULL,
  "color" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "system" boolean DEFAULT false,
  "slug" text NOT NULL,
  "tax_rate" numeric(10, 2),
  "tax_type" text,
  "tax_reporting_code" text,
  "excluded" boolean DEFAULT false,
  "description" text,
  "parent_id" uuid,
  PRIMARY KEY ("team_id", "slug"),
  CONSTRAINT "transaction_categories_id_unique" UNIQUE("id"),
  CONSTRAINT "transaction_categories_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
  CONSTRAINT "unique_team_slug" UNIQUE("team_id", "slug")
);

CREATE INDEX "transaction_categories_team_id_idx" ON "transaction_categories" USING btree ("team_id");
CREATE INDEX "transaction_categories_parent_id_idx" ON "transaction_categories" USING btree ("parent_id");

-- Add self-referential FK after table creation (to avoid circular reference issues)
ALTER TABLE "transaction_categories" 
  ADD CONSTRAINT "transaction_categories_parent_id_fkey" 
  FOREIGN KEY ("parent_id") REFERENCES "transaction_categories"("id") ON DELETE SET NULL;

-- Transactions
CREATE TABLE IF NOT EXISTS "transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "date" date NOT NULL,
  "name" text NOT NULL,
  "method" "transactionMethods" NOT NULL,
  "amount" numeric(10, 2) NOT NULL,
  "currency" text NOT NULL,
  "team_id" uuid NOT NULL,
  "assigned_id" uuid,
  "note" varchar,
  "bank_account_id" uuid,
  "internal_id" text NOT NULL,
  "status" "transactionStatus" DEFAULT 'posted',
  "balance" numeric(10, 2),
  "manual" boolean DEFAULT false,
  "notified" boolean DEFAULT false,
  "internal" boolean DEFAULT false,
  "description" text,
  "category_slug" text,
  "base_amount" numeric(10, 2),
  "counterparty_name" text,
  "base_currency" text,
  "tax_amount" numeric(10, 2),
  "tax_rate" numeric(10, 2),
  "tax_type" text,
  "recurring" boolean,
  "frequency" "transaction_frequency",
  "merchant_name" text,
  "enrichment_completed" boolean DEFAULT false,
  "fts_vector" tsvector GENERATED ALWAYS AS (to_tsvector('english', (COALESCE(name, ''::text) || ' '::text) || COALESCE(description, ''::text))) STORED NOT NULL,
  CONSTRAINT "public_transactions_assigned_id_fkey" FOREIGN KEY ("assigned_id") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "public_transactions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
  CONSTRAINT "transactions_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE CASCADE,
  CONSTRAINT "transactions_category_slug_team_id_fkey" FOREIGN KEY ("team_id", "category_slug") REFERENCES "transaction_categories"("team_id", "slug"),
  CONSTRAINT "transactions_internal_id_key" UNIQUE("internal_id")
);

CREATE INDEX "idx_transactions_date" ON "transactions" USING btree ("date");
CREATE INDEX "idx_transactions_fts" ON "transactions" USING gin ("fts_vector");
CREATE INDEX "idx_transactions_fts_vector" ON "transactions" USING gin ("fts_vector");
CREATE INDEX "idx_transactions_id" ON "transactions" USING btree ("id");
CREATE INDEX "idx_transactions_name" ON "transactions" USING btree ("name");
CREATE INDEX "idx_transactions_name_trigram" ON "transactions" USING gin ("name" gin_trgm_ops);
CREATE INDEX "idx_transactions_team_id_date_name" ON "transactions" USING btree ("team_id", "date", "name");
CREATE INDEX "idx_transactions_team_id_name" ON "transactions" USING btree ("team_id", "name");
CREATE INDEX "idx_trgm_name" ON "transactions" USING gist ("name" gist_trgm_ops);
CREATE INDEX "transactions_assigned_id_idx" ON "transactions" USING btree ("assigned_id");
CREATE INDEX "transactions_bank_account_id_idx" ON "transactions" USING btree ("bank_account_id");
CREATE INDEX "transactions_category_slug_idx" ON "transactions" USING btree ("category_slug");
CREATE INDEX "transactions_team_id_date_currency_bank_account_id_category_idx" ON "transactions" USING btree ("team_id", "date", "currency", "bank_account_id");
CREATE INDEX "transactions_team_id_idx" ON "transactions" USING btree ("team_id");

-- Tags
CREATE TABLE IF NOT EXISTS "tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "team_id" uuid NOT NULL,
  "name" text NOT NULL,
  CONSTRAINT "tags_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
  CONSTRAINT "unique_tag_name" UNIQUE("team_id", "name")
);

CREATE INDEX "tags_team_id_idx" ON "tags" USING btree ("team_id");

-- Transaction tags
CREATE TABLE IF NOT EXISTS "transaction_tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "team_id" uuid NOT NULL,
  "tag_id" uuid NOT NULL,
  "transaction_id" uuid NOT NULL,
  CONSTRAINT "transaction_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE,
  CONSTRAINT "transaction_tags_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
  CONSTRAINT "transaction_tags_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE,
  CONSTRAINT "unique_tag" UNIQUE("tag_id", "transaction_id")
);

CREATE INDEX "transaction_tags_tag_id_idx" ON "transaction_tags" USING btree ("tag_id");
CREATE INDEX "transaction_tags_team_id_idx" ON "transaction_tags" USING btree ("team_id");
CREATE INDEX "transaction_tags_transaction_id_tag_id_team_id_idx" ON "transaction_tags" USING btree ("transaction_id", "tag_id", "team_id");

-- Transaction attachments
CREATE TABLE IF NOT EXISTS "transaction_attachments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "type" text,
  "transaction_id" uuid,
  "team_id" uuid,
  "size" bigint,
  "name" text,
  "path" text[],
  CONSTRAINT "public_transaction_attachments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
  CONSTRAINT "public_transaction_attachments_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL
);

CREATE INDEX "transaction_attachments_team_id_idx" ON "transaction_attachments" USING btree ("team_id");
CREATE INDEX "transaction_attachments_transaction_id_idx" ON "transaction_attachments" USING btree ("transaction_id");

-- Customers
CREATE TABLE IF NOT EXISTS "customers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "billing_email" text,
  "country" text,
  "address_line_1" text,
  "address_line_2" text,
  "city" text,
  "state" text,
  "zip" text,
  "note" text,
  "team_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "website" text,
  "phone" text,
  "vat_number" text,
  "country_code" text,
  "token" text DEFAULT '' NOT NULL,
  "contact" text,
  "fts" tsvector GENERATED ALWAYS AS (
    to_tsvector('english'::regconfig,
      COALESCE(name, ''::text) || ' ' ||
      COALESCE(contact, ''::text) || ' ' ||
      COALESCE(phone, ''::text) || ' ' ||
      COALESCE(email, ''::text) || ' ' ||
      COALESCE(address_line_1, ''::text) || ' ' ||
      COALESCE(address_line_2, ''::text) || ' ' ||
      COALESCE(city, ''::text) || ' ' ||
      COALESCE(state, ''::text) || ' ' ||
      COALESCE(zip, ''::text) || ' ' ||
      COALESCE(country, ''::text)
    )
  ) STORED NOT NULL,
  CONSTRAINT "customers_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE
);

CREATE INDEX "customers_fts" ON "customers" USING gin ("fts");

-- Customer tags
CREATE TABLE IF NOT EXISTS "customer_tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "customer_id" uuid NOT NULL,
  "team_id" uuid NOT NULL,
  "tag_id" uuid NOT NULL,
  CONSTRAINT "customer_tags_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE,
  CONSTRAINT "customer_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE,
  CONSTRAINT "customer_tags_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
  CONSTRAINT "unique_customer_tag" UNIQUE("customer_id", "tag_id")
);

-- Invoices
CREATE TABLE IF NOT EXISTS "invoices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now(),
  "due_date" timestamp with time zone,
  "invoice_number" text,
  "customer_id" uuid,
  "amount" numeric(10, 2),
  "currency" text,
  "line_items" jsonb,
  "payment_details" jsonb,
  "customer_details" jsonb,
  "company_datails" jsonb,
  "note" text,
  "internal_note" text,
  "team_id" uuid NOT NULL,
  "paid_at" timestamp with time zone,
  "fts" tsvector GENERATED ALWAYS AS (
    to_tsvector('english', (COALESCE((amount)::text, ''::text) || ' '::text) || COALESCE(invoice_number, ''::text))
  ) STORED NOT NULL,
  "vat" numeric(10, 2),
  "tax" numeric(10, 2),
  "url" text,
  "file_path" text[],
  "status" "invoice_status" DEFAULT 'draft' NOT NULL,
  "viewed_at" timestamp with time zone,
  "from_details" jsonb,
  "issue_date" timestamp with time zone,
  "template" jsonb,
  "note_details" jsonb,
  "customer_name" text,
  "token" text DEFAULT '' NOT NULL,
  "sent_to" text,
  "reminder_sent_at" timestamp with time zone,
  "discount" numeric(10, 2),
  "file_size" bigint,
  "user_id" uuid,
  "subtotal" numeric(10, 2),
  "top_block" jsonb,
  "bottom_block" jsonb,
  "sent_at" timestamp with time zone,
  "scheduled_at" timestamp with time zone,
  "scheduled_job_id" text,
  CONSTRAINT "invoices_created_by_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL,
  CONSTRAINT "invoices_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
  CONSTRAINT "invoices_scheduled_job_id_key" UNIQUE("scheduled_job_id")
);

CREATE INDEX "invoices_created_at_idx" ON "invoices" USING btree ("created_at");
CREATE INDEX "invoices_fts" ON "invoices" USING gin ("fts");
CREATE INDEX "invoices_team_id_idx" ON "invoices" USING btree ("team_id");

-- Invoice templates
CREATE TABLE IF NOT EXISTS "invoice_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "team_id" uuid NOT NULL,
  "customer_label" text,
  "from_label" text,
  "invoice_no_label" text,
  "issue_date_label" text,
  "due_date_label" text,
  "description_label" text,
  "price_label" text,
  "quantity_label" text,
  "total_label" text,
  "vat_label" text,
  "tax_label" text,
  "payment_label" text,
  "note_label" text,
  "logo_url" text,
  "currency" text,
  "payment_details" jsonb,
  "from_details" jsonb,
  "note_details" jsonb,
  "size" "invoice_size" DEFAULT 'a4',
  "date_format" text,
  "include_vat" boolean,
  "include_tax" boolean,
  "tax_rate" numeric(10, 2),
  "delivery_type" "invoice_delivery_type" DEFAULT 'create' NOT NULL,
  "discount_label" text,
  "include_discount" boolean,
  "include_decimals" boolean,
  "include_qr" boolean,
  "total_summary_label" text,
  "title" text,
  "vat_rate" numeric(10, 2),
  "include_units" boolean,
  "subtotal_label" text,
  "include_pdf" boolean,
  "send_copy" boolean,
  CONSTRAINT "invoice_settings_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
  CONSTRAINT "invoice_templates_team_id_key" UNIQUE("team_id")
);

-- Invoice products
CREATE TABLE IF NOT EXISTS "invoice_products" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now(),
  "team_id" uuid NOT NULL,
  "created_by" uuid,
  "name" text NOT NULL,
  "description" text,
  "price" numeric(10, 2),
  "currency" text,
  "unit" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "usage_count" integer DEFAULT 0 NOT NULL,
  "last_used_at" timestamp with time zone,
  "fts" tsvector GENERATED ALWAYS AS (
    to_tsvector('english', (COALESCE(name, ''::text) || ' '::text) || COALESCE(description, ''::text))
  ) STORED NOT NULL,
  CONSTRAINT "invoice_products_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
  CONSTRAINT "invoice_products_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "invoice_products_team_name_currency_price_unique" UNIQUE("team_id", "name", "currency", "price")
);

CREATE INDEX "invoice_products_team_id_idx" ON "invoice_products" ("team_id");
CREATE INDEX "invoice_products_created_by_idx" ON "invoice_products" ("created_by");
CREATE INDEX "invoice_products_fts_idx" ON "invoice_products" USING gin ("fts");
CREATE INDEX "invoice_products_name_idx" ON "invoice_products" ("name");
CREATE INDEX "invoice_products_usage_count_idx" ON "invoice_products" ("usage_count");
CREATE INDEX "invoice_products_last_used_at_idx" ON "invoice_products" ("last_used_at");
CREATE INDEX "invoice_products_team_active_idx" ON "invoice_products" ("team_id", "is_active");

-- Invoice comments
CREATE TABLE IF NOT EXISTS "invoice_comments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Tracker projects
CREATE TABLE IF NOT EXISTS "tracker_projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "team_id" uuid,
  "rate" numeric(10, 2),
  "currency" text,
  "status" "trackerStatus" DEFAULT 'in_progress' NOT NULL,
  "description" text,
  "name" text NOT NULL,
  "billable" boolean DEFAULT false,
  "estimate" bigint,
  "customer_id" uuid,
  "fts" tsvector GENERATED ALWAYS AS (
    to_tsvector('english'::regconfig, (COALESCE(name, ''::text) || ' '::text) || COALESCE(description, ''::text))
  ) STORED NOT NULL,
  CONSTRAINT "tracker_projects_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE,
  CONSTRAINT "tracker_projects_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE
);

CREATE INDEX "tracker_projects_fts" ON "tracker_projects" USING gin ("fts");
CREATE INDEX "tracker_projects_team_id_idx" ON "tracker_projects" USING btree ("team_id");

-- Tracker entries
CREATE TABLE IF NOT EXISTS "tracker_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "duration" bigint,
  "project_id" uuid,
  "start" timestamp with time zone,
  "stop" timestamp with time zone,
  "assigned_id" uuid,
  "team_id" uuid,
  "description" text,
  "rate" numeric(10, 2),
  "currency" text,
  "billed" boolean DEFAULT false,
  "date" date DEFAULT now(),
  CONSTRAINT "tracker_entries_assigned_id_fkey" FOREIGN KEY ("assigned_id") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "tracker_entries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "tracker_projects"("id") ON DELETE CASCADE,
  CONSTRAINT "tracker_entries_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE
);

CREATE INDEX "tracker_entries_team_id_idx" ON "tracker_entries" USING btree ("team_id");

-- Tracker project tags
CREATE TABLE IF NOT EXISTS "tracker_project_tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "tracker_project_id" uuid NOT NULL,
  "tag_id" uuid NOT NULL,
  "team_id" uuid NOT NULL,
  CONSTRAINT "project_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE,
  CONSTRAINT "project_tags_tracker_project_id_fkey" FOREIGN KEY ("tracker_project_id") REFERENCES "tracker_projects"("id") ON DELETE CASCADE,
  CONSTRAINT "tracker_project_tags_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
  CONSTRAINT "unique_project_tag" UNIQUE("tracker_project_id", "tag_id")
);

CREATE INDEX "tracker_project_tags_team_id_idx" ON "tracker_project_tags" USING btree ("team_id");
CREATE INDEX "tracker_project_tags_tracker_project_id_tag_id_team_id_idx" ON "tracker_project_tags" USING btree ("tracker_project_id", "tag_id", "team_id");

-- Tracker reports
CREATE TABLE IF NOT EXISTS "tracker_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "link_id" text,
  "short_link" text,
  "team_id" uuid DEFAULT gen_random_uuid(),
  "project_id" uuid DEFAULT gen_random_uuid(),
  "created_by" uuid,
  CONSTRAINT "public_tracker_reports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "public_tracker_reports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "tracker_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "tracker_reports_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "tracker_reports_team_id_idx" ON "tracker_reports" USING btree ("team_id");

-- Reports
CREATE TABLE IF NOT EXISTS "reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "link_id" text,
  "team_id" uuid,
  "short_link" text,
  "from" timestamp with time zone,
  "to" timestamp with time zone,
  "type" "reportTypes",
  "expire_at" timestamp with time zone,
  "currency" text,
  "created_by" uuid,
  CONSTRAINT "public_reports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "reports_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE
);

CREATE INDEX "reports_team_id_idx" ON "reports" USING btree ("team_id");

-- Inbox accounts
CREATE TABLE IF NOT EXISTS "inbox_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "email" text NOT NULL,
  "access_token" text NOT NULL,
  "refresh_token" text NOT NULL,
  "team_id" uuid NOT NULL,
  "last_accessed" timestamp with time zone NOT NULL,
  "provider" "inbox_account_providers" NOT NULL,
  "external_id" text NOT NULL,
  "expiry_date" timestamp with time zone NOT NULL,
  "schedule_id" text,
  "status" "inbox_account_status" DEFAULT 'connected' NOT NULL,
  "error_message" text,
  CONSTRAINT "inbox_accounts_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
  CONSTRAINT "inbox_accounts_email_key" UNIQUE("email"),
  CONSTRAINT "inbox_accounts_external_id_key" UNIQUE("external_id")
);

-- Inbox
CREATE TABLE IF NOT EXISTS "inbox" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "team_id" uuid,
  "file_path" text[],
  "file_name" text,
  "transaction_id" uuid,
  "amount" numeric(10, 2),
  "currency" text,
  "content_type" text,
  "size" bigint,
  "attachment_id" uuid,
  "date" date,
  "forwarded_to" text,
  "reference_id" text,
  "meta" json,
  "status" "inbox_status" DEFAULT 'new',
  "website" text,
  "sender_email" text,
  "display_name" text,
  "fts" tsvector GENERATED ALWAYS AS (generate_inbox_fts(display_name, extract_product_names((meta -> 'products'::text)))) STORED NOT NULL,
  "type" "inbox_type",
  "description" text,
  "base_amount" numeric(10, 2),
  "base_currency" text,
  "tax_amount" numeric(10, 2),
  "tax_rate" numeric(10, 2),
  "tax_type" text,
  "inbox_account_id" uuid,
  "invoice_number" text,
  "grouped_inbox_id" uuid,
  CONSTRAINT "inbox_attachment_id_fkey" FOREIGN KEY ("attachment_id") REFERENCES "transaction_attachments"("id") ON DELETE SET NULL,
  CONSTRAINT "public_inbox_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
  CONSTRAINT "public_inbox_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL,
  CONSTRAINT "inbox_inbox_account_id_fkey" FOREIGN KEY ("inbox_account_id") REFERENCES "inbox_accounts"("id") ON DELETE SET NULL,
  CONSTRAINT "inbox_reference_id_key" UNIQUE("reference_id")
);

CREATE INDEX "inbox_attachment_id_idx" ON "inbox" USING btree ("attachment_id");
CREATE INDEX "inbox_created_at_idx" ON "inbox" USING btree ("created_at");
CREATE INDEX "inbox_team_id_idx" ON "inbox" USING btree ("team_id");
CREATE INDEX "inbox_transaction_id_idx" ON "inbox" USING btree ("transaction_id");
CREATE INDEX "inbox_inbox_account_id_idx" ON "inbox" USING btree ("inbox_account_id");
CREATE INDEX "inbox_invoice_number_idx" ON "inbox" USING btree ("invoice_number");
CREATE INDEX "inbox_grouped_inbox_id_idx" ON "inbox" USING btree ("grouped_inbox_id");

-- Inbox blocklist
CREATE TABLE IF NOT EXISTS "inbox_blocklist" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "team_id" uuid NOT NULL,
  "type" "inbox_blocklist_type" NOT NULL,
  "value" text NOT NULL,
  CONSTRAINT "inbox_blocklist_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
  CONSTRAINT "inbox_blocklist_team_id_type_value_key" UNIQUE("team_id", "type", "value")
);

-- Documents
CREATE TABLE IF NOT EXISTS "documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "metadata" jsonb,
  "path_tokens" text[],
  "team_id" uuid,
  "parent_id" text,
  "object_id" uuid,
  "owner_id" uuid,
  "tag" text,
  "title" text,
  "body" text,
  "fts" tsvector GENERATED ALWAYS AS (to_tsvector('english'::regconfig, ((COALESCE(title, '') || ' '::text) || COALESCE(body, '')))) STORED NOT NULL,
  "summary" text,
  "content" text,
  "date" date,
  "language" text,
  "processing_status" "document_processing_status" DEFAULT 'pending',
  "fts_simple" tsvector,
  "fts_english" tsvector,
  "fts_language" tsvector,
  CONSTRAINT "documents_created_by_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "storage_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE
);

CREATE INDEX "documents_name_idx" ON "documents" USING btree ("name");
CREATE INDEX "documents_team_id_idx" ON "documents" USING btree ("team_id");
CREATE INDEX "documents_team_id_parent_id_idx" ON "documents" USING btree ("team_id", "parent_id");
CREATE INDEX "documents_team_id_created_at_idx" ON "documents" USING btree ("team_id", "created_at" DESC);
CREATE INDEX "documents_team_id_date_idx" ON "documents" USING btree ("team_id", "date");
CREATE INDEX "documents_team_id_name_idx" ON "documents" USING btree ("team_id", "name");
CREATE INDEX "idx_documents_fts_english" ON "documents" USING gin ("fts_english");
CREATE INDEX "idx_documents_fts_language" ON "documents" USING gin ("fts_language");
CREATE INDEX "idx_documents_fts_simple" ON "documents" USING gin ("fts_simple");
CREATE INDEX "idx_gin_documents_title" ON "documents" USING gin ("title" gin_trgm_ops);
CREATE INDEX "idx_gin_documents_name" ON "documents" USING gin ("name" gin_trgm_ops);

-- Document tags
CREATE TABLE IF NOT EXISTS "document_tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "team_id" uuid NOT NULL,
  CONSTRAINT "document_tags_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
  CONSTRAINT "unique_slug_per_team" UNIQUE("slug", "team_id")
);

-- Document tag assignments
CREATE TABLE IF NOT EXISTS "document_tag_assignments" (
  "document_id" uuid NOT NULL,
  "tag_id" uuid NOT NULL,
  "team_id" uuid NOT NULL,
  PRIMARY KEY ("document_id", "tag_id"),
  CONSTRAINT "document_tag_assignments_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE,
  CONSTRAINT "document_tag_assignments_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "document_tags"("id") ON DELETE CASCADE,
  CONSTRAINT "document_tag_assignments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
  CONSTRAINT "document_tag_assignments_unique" UNIQUE("document_id", "tag_id")
);

CREATE INDEX "idx_document_tag_assignments_document_id" ON "document_tag_assignments" USING btree ("document_id");
CREATE INDEX "idx_document_tag_assignments_tag_id" ON "document_tag_assignments" USING btree ("tag_id");

-- Document tag embeddings
CREATE TABLE IF NOT EXISTS "document_tag_embeddings" (
  "slug" text PRIMARY KEY NOT NULL,
  "embedding" vector(768),
  "name" text NOT NULL,
  "model" text DEFAULT 'gemini-embedding-001' NOT NULL
);

CREATE INDEX "document_tag_embeddings_idx" ON "document_tag_embeddings" USING hnsw ("embedding" vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- Transaction category embeddings
CREATE TABLE IF NOT EXISTS "transaction_category_embeddings" (
  "name" text PRIMARY KEY NOT NULL,
  "embedding" vector(768),
  "model" text DEFAULT 'gemini-embedding-001' NOT NULL,
  "system" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "transaction_category_embeddings_vector_idx" ON "transaction_category_embeddings" USING hnsw ("embedding" vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX "transaction_category_embeddings_system_idx" ON "transaction_category_embeddings" USING btree ("system");

-- Transaction embeddings
CREATE TABLE IF NOT EXISTS "transaction_embeddings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "transaction_id" uuid NOT NULL,
  "team_id" uuid NOT NULL,
  "embedding" vector(768),
  "source_text" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "model" text DEFAULT 'gemini-embedding-001' NOT NULL,
  CONSTRAINT "transaction_embeddings_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE,
  CONSTRAINT "transaction_embeddings_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
  CONSTRAINT "transaction_embeddings_unique" UNIQUE("transaction_id")
);

CREATE INDEX "transaction_embeddings_transaction_id_idx" ON "transaction_embeddings" USING btree ("transaction_id");
CREATE INDEX "transaction_embeddings_team_id_idx" ON "transaction_embeddings" USING btree ("team_id");
CREATE INDEX "transaction_embeddings_vector_idx" ON "transaction_embeddings" USING hnsw ("embedding" vector_cosine_ops);

-- Inbox embeddings
CREATE TABLE IF NOT EXISTS "inbox_embeddings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "inbox_id" uuid NOT NULL,
  "team_id" uuid NOT NULL,
  "embedding" vector(768),
  "source_text" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "model" text DEFAULT 'gemini-embedding-001' NOT NULL,
  CONSTRAINT "inbox_embeddings_inbox_id_fkey" FOREIGN KEY ("inbox_id") REFERENCES "inbox"("id") ON DELETE CASCADE,
  CONSTRAINT "inbox_embeddings_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
  CONSTRAINT "inbox_embeddings_unique" UNIQUE("inbox_id")
);

CREATE INDEX "inbox_embeddings_inbox_id_idx" ON "inbox_embeddings" USING btree ("inbox_id");
CREATE INDEX "inbox_embeddings_team_id_idx" ON "inbox_embeddings" USING btree ("team_id");
CREATE INDEX "inbox_embeddings_vector_idx" ON "inbox_embeddings" USING hnsw ("embedding" vector_cosine_ops);

-- Transaction match suggestions
CREATE TABLE IF NOT EXISTS "transaction_match_suggestions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "team_id" uuid NOT NULL,
  "inbox_id" uuid NOT NULL,
  "transaction_id" uuid NOT NULL,
  "confidence_score" numeric(4, 3) NOT NULL,
  "amount_score" numeric(4, 3),
  "currency_score" numeric(4, 3),
  "date_score" numeric(4, 3),
  "embedding_score" numeric(4, 3),
  "name_score" numeric(4, 3),
  "match_type" text NOT NULL,
  "match_details" jsonb,
  "status" text DEFAULT 'pending' NOT NULL,
  "user_action_at" timestamp with time zone,
  "user_id" uuid,
  CONSTRAINT "transaction_match_suggestions_inbox_id_fkey" FOREIGN KEY ("inbox_id") REFERENCES "inbox"("id") ON DELETE CASCADE,
  CONSTRAINT "transaction_match_suggestions_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE,
  CONSTRAINT "transaction_match_suggestions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
  CONSTRAINT "transaction_match_suggestions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "transaction_match_suggestions_unique" UNIQUE("inbox_id", "transaction_id")
);

CREATE INDEX "transaction_match_suggestions_inbox_id_idx" ON "transaction_match_suggestions" USING btree ("inbox_id");
CREATE INDEX "transaction_match_suggestions_transaction_id_idx" ON "transaction_match_suggestions" USING btree ("transaction_id");
CREATE INDEX "transaction_match_suggestions_team_id_idx" ON "transaction_match_suggestions" USING btree ("team_id");
CREATE INDEX "transaction_match_suggestions_status_idx" ON "transaction_match_suggestions" USING btree ("status");
CREATE INDEX "transaction_match_suggestions_confidence_idx" ON "transaction_match_suggestions" ("confidence_score" DESC);
CREATE INDEX "transaction_match_suggestions_lookup_idx" ON "transaction_match_suggestions" USING btree ("transaction_id", "team_id", "status");

-- Transaction enrichments
CREATE TABLE IF NOT EXISTS "transaction_enrichments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "name" text,
  "team_id" uuid,
  "category_slug" text,
  "system" boolean DEFAULT false,
  CONSTRAINT "transaction_enrichments_category_slug_team_id_fkey" FOREIGN KEY ("team_id", "category_slug") REFERENCES "transaction_categories"("team_id", "slug") ON DELETE CASCADE,
  CONSTRAINT "transaction_enrichments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
  CONSTRAINT "unique_team_name" UNIQUE("name", "team_id")
);

CREATE INDEX "transaction_enrichments_category_slug_team_id_idx" ON "transaction_enrichments" USING btree ("category_slug", "team_id");

-- Exchange rates
CREATE TABLE IF NOT EXISTS "exchange_rates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "base" text,
  "rate" numeric(10, 2),
  "target" text,
  "updated_at" timestamp with time zone,
  CONSTRAINT "unique_rate" UNIQUE("base", "target")
);

CREATE INDEX "exchange_rates_base_target_idx" ON "exchange_rates" USING btree ("base", "target");

-- User invites
CREATE TABLE IF NOT EXISTS "user_invites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "team_id" uuid,
  "email" text,
  "role" "teamRoles",
  "code" text DEFAULT encode(gen_random_bytes(18), 'base64'),
  "invited_by" uuid,
  CONSTRAINT "public_user_invites_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
  CONSTRAINT "user_invites_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "unique_team_invite" UNIQUE("team_id", "email"),
  CONSTRAINT "user_invites_code_key" UNIQUE("code")
);

CREATE INDEX "user_invites_team_id_idx" ON "user_invites" USING btree ("team_id");

-- Apps
CREATE TABLE IF NOT EXISTS "apps" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "team_id" uuid DEFAULT gen_random_uuid(),
  "config" jsonb,
  "created_at" timestamp with time zone DEFAULT now(),
  "app_id" text NOT NULL,
  "created_by" uuid DEFAULT gen_random_uuid(),
  "settings" jsonb,
  CONSTRAINT "apps_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "integrations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
  CONSTRAINT "unique_app_id_team_id" UNIQUE("team_id", "app_id")
);

-- API keys
CREATE TABLE IF NOT EXISTS "api_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key_encrypted" text NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "user_id" uuid NOT NULL,
  "team_id" uuid NOT NULL,
  "key_hash" text,
  "scopes" text[] DEFAULT '{}'::text[] NOT NULL,
  "last_used_at" timestamp with time zone,
  CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "api_keys_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
  CONSTRAINT "api_keys_key_unique" UNIQUE("key_hash")
);

CREATE INDEX "api_keys_key_idx" ON "api_keys" USING btree ("key_hash");
CREATE INDEX "api_keys_user_id_idx" ON "api_keys" USING btree ("user_id");
CREATE INDEX "api_keys_team_id_idx" ON "api_keys" USING btree ("team_id");

-- Short links
CREATE TABLE IF NOT EXISTS "short_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "short_id" text NOT NULL,
  "url" text NOT NULL,
  "type" text,
  "size" numeric(10, 2),
  "mime_type" text,
  "file_name" text,
  "team_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "short_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "short_links_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
  CONSTRAINT "short_links_short_id_unique" UNIQUE("short_id")
);

CREATE INDEX "short_links_short_id_idx" ON "short_links" USING btree ("short_id");
CREATE INDEX "short_links_team_id_idx" ON "short_links" USING btree ("team_id");
CREATE INDEX "short_links_user_id_idx" ON "short_links" USING btree ("user_id");

-- OAuth applications
CREATE TABLE IF NOT EXISTS "oauth_applications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "description" text,
  "overview" text,
  "developer_name" text,
  "logo_url" text,
  "website" text,
  "install_url" text,
  "screenshots" text[] DEFAULT '{}'::text[],
  "redirect_uris" text[] NOT NULL,
  "client_id" text NOT NULL UNIQUE,
  "client_secret" text NOT NULL,
  "scopes" text[] DEFAULT '{}'::text[] NOT NULL,
  "team_id" uuid NOT NULL,
  "created_by" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "is_public" boolean DEFAULT false,
  "active" boolean DEFAULT true,
  "status" text DEFAULT 'draft',
  CONSTRAINT "oauth_applications_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
  CONSTRAINT "oauth_applications_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX "oauth_applications_team_id_idx" ON "oauth_applications" USING btree ("team_id");
CREATE INDEX "oauth_applications_client_id_idx" ON "oauth_applications" USING btree ("client_id");
CREATE INDEX "oauth_applications_slug_idx" ON "oauth_applications" USING btree ("slug");

-- OAuth authorization codes
CREATE TABLE IF NOT EXISTS "oauth_authorization_codes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL UNIQUE,
  "application_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "team_id" uuid NOT NULL,
  "scopes" text[] NOT NULL,
  "redirect_uri" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "used" boolean DEFAULT false,
  "code_challenge" text,
  "code_challenge_method" text,
  CONSTRAINT "oauth_authorization_codes_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "oauth_applications"("id") ON DELETE CASCADE,
  CONSTRAINT "oauth_authorization_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "oauth_authorization_codes_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE
);

CREATE INDEX "oauth_authorization_codes_code_idx" ON "oauth_authorization_codes" USING btree ("code");
CREATE INDEX "oauth_authorization_codes_application_id_idx" ON "oauth_authorization_codes" USING btree ("application_id");
CREATE INDEX "oauth_authorization_codes_user_id_idx" ON "oauth_authorization_codes" USING btree ("user_id");

-- OAuth access tokens
CREATE TABLE IF NOT EXISTS "oauth_access_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "token" text NOT NULL UNIQUE,
  "refresh_token" text UNIQUE,
  "application_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "team_id" uuid NOT NULL,
  "scopes" text[] NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "refresh_token_expires_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_used_at" timestamp with time zone,
  "revoked" boolean DEFAULT false,
  "revoked_at" timestamp with time zone,
  CONSTRAINT "oauth_access_tokens_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "oauth_applications"("id") ON DELETE CASCADE,
  CONSTRAINT "oauth_access_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "oauth_access_tokens_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE
);

CREATE INDEX "oauth_access_tokens_token_idx" ON "oauth_access_tokens" USING btree ("token");
CREATE INDEX "oauth_access_tokens_refresh_token_idx" ON "oauth_access_tokens" USING btree ("refresh_token");
CREATE INDEX "oauth_access_tokens_application_id_idx" ON "oauth_access_tokens" USING btree ("application_id");
CREATE INDEX "oauth_access_tokens_user_id_idx" ON "oauth_access_tokens" USING btree ("user_id");

-- Activities
CREATE TABLE IF NOT EXISTS "activities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "team_id" uuid NOT NULL,
  "user_id" uuid,
  "type" "activity_type" NOT NULL,
  "priority" smallint DEFAULT 5,
  "group_id" uuid,
  "source" "activity_source" NOT NULL,
  "metadata" jsonb NOT NULL,
  "status" "activity_status" DEFAULT 'unread' NOT NULL,
  "last_used_at" timestamp with time zone,
  CONSTRAINT "activities_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
  CONSTRAINT "activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE INDEX "activities_notifications_idx" ON "activities" USING btree ("team_id", "priority", "status", "created_at" DESC);
CREATE INDEX "activities_insights_idx" ON "activities" USING btree ("team_id", "type", "source", "created_at" DESC);
CREATE INDEX "activities_metadata_gin_idx" ON "activities" USING gin ("metadata");
CREATE INDEX "activities_group_id_idx" ON "activities" ("group_id");
CREATE INDEX "activities_insights_group_idx" ON "activities" USING btree ("team_id", "group_id", "type", "created_at" DESC);

-- Notification settings
CREATE TABLE IF NOT EXISTS "notification_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "team_id" uuid NOT NULL,
  "notification_type" text NOT NULL,
  "channel" text NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "notification_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "notification_settings_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
  CONSTRAINT "notification_settings_user_team_type_channel_key" UNIQUE("user_id", "team_id", "notification_type", "channel")
);

CREATE INDEX "notification_settings_user_team_idx" ON "notification_settings" ("user_id", "team_id");
CREATE INDEX "notification_settings_type_channel_idx" ON "notification_settings" ("notification_type", "channel");