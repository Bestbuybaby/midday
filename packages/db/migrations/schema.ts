import { pgTable, unique, uuid, timestamp, text, boolean, smallint, jsonb, index, foreignKey, numeric, date, varchar, bigint, integer, json, vector, primaryKey, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const accountType = pgEnum("account_type", ['depository', 'credit', 'other_asset', 'loan', 'other_liability'])
export const activitySource = pgEnum("activity_source", ['system', 'user'])
export const activityStatus = pgEnum("activity_status", ['unread', 'read', 'archived'])
export const activityType = pgEnum("activity_type", ['transactions_enriched', 'transactions_created', 'invoice_paid', 'inbox_new', 'inbox_auto_matched', 'inbox_needs_review', 'inbox_cross_currency_matched', 'invoice_overdue', 'invoice_sent', 'inbox_match_confirmed', 'document_uploaded', 'document_processed', 'invoice_duplicated', 'invoice_scheduled', 'invoice_reminder_sent', 'invoice_cancelled', 'invoice_created', 'draft_invoice_created', 'tracker_entry_created', 'tracker_project_created', 'transactions_categorized', 'transactions_assigned', 'transaction_attachment_created', 'transaction_category_created', 'transactions_exported', 'customer_created'])
export const bankProviders = pgEnum("bank_providers", ['gocardless', 'plaid', 'teller', 'enablebanking'])
export const connectionStatus = pgEnum("connection_status", ['disconnected', 'connected', 'unknown'])
export const documentProcessingStatus = pgEnum("document_processing_status", ['pending', 'processing', 'completed', 'failed'])
export const inboxAccountProviders = pgEnum("inbox_account_providers", ['gmail', 'outlook'])
export const inboxAccountStatus = pgEnum("inbox_account_status", ['connected', 'disconnected'])
export const inboxBlocklistType = pgEnum("inbox_blocklist_type", ['email', 'domain'])
export const inboxStatus = pgEnum("inbox_status", ['processing', 'pending', 'archived', 'new', 'analyzing', 'suggested_match', 'no_match', 'done', 'deleted'])
export const inboxType = pgEnum("inbox_type", ['invoice', 'expense'])
export const invoiceDeliveryType = pgEnum("invoice_delivery_type", ['create', 'create_and_send', 'scheduled'])
export const invoiceSize = pgEnum("invoice_size", ['a4', 'letter'])
export const invoiceStatus = pgEnum("invoice_status", ['draft', 'overdue', 'paid', 'unpaid', 'canceled', 'scheduled'])
export const plans = pgEnum("plans", ['trial', 'starter', 'pro'])
export const reportTypes = pgEnum("reportTypes", ['profit', 'revenue', 'burn_rate', 'expense', 'monthly_revenue', 'revenue_forecast', 'runway', 'category_expenses'])
export const subscriptionStatus = pgEnum("subscription_status", ['active', 'canceled', 'past_due', 'unpaid', 'trialing', 'incomplete', 'incomplete_expired'])
export const teamRoles = pgEnum("teamRoles", ['owner', 'member'])
export const trackerStatus = pgEnum("trackerStatus", ['in_progress', 'completed'])
export const transactionMethods = pgEnum("transactionMethods", ['payment', 'card_purchase', 'card_atm', 'transfer', 'other', 'unknown', 'ach', 'interest', 'deposit', 'wire', 'fee'])
export const transactionStatus = pgEnum("transactionStatus", ['posted', 'pending', 'excluded', 'completed', 'archived'])
export const transactionFrequency = pgEnum("transaction_frequency", ['weekly', 'biweekly', 'monthly', 'semi_monthly', 'annually', 'irregular', 'unknown'])


export const teams = pgTable("teams", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	name: text(),
	logoUrl: text("logo_url"),
	inboxId: text("inbox_id").default(generate_inbox(10)),
	email: text(),
	inboxEmail: text("inbox_email"),
	inboxForwarding: boolean("inbox_forwarding").default(true),
	baseCurrency: text("base_currency"),
	countryCode: text("country_code"),
	fiscalYearStartMonth: smallint("fiscal_year_start_month"),
	documentClassification: boolean("document_classification").default(false),
	flags: text().array(),
	canceledAt: timestamp("canceled_at", { withTimezone: true, mode: 'string' }),
	plan: plans().default('trial').notNull(),
	exportSettings: jsonb("export_settings"),
}, (table) => [
	unique("teams_inbox_id_key").on(table.inboxId),
]);

export const users = pgTable("users", {
	id: uuid().primaryKey().notNull(),
	fullName: text("full_name"),
	avatarUrl: text("avatar_url"),
	email: text(),
	teamId: uuid("team_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	locale: text().default('en'),
	weekStartsOnMonday: boolean("week_starts_on_monday").default(false),
	timezone: text(),
	timezoneAutoSync: boolean("timezone_auto_sync").default(true),
	timeFormat: numeric("time_format").default('24'),
	dateFormat: text("date_format"),
}, (table) => [
	index("users_team_id_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "users_team_id_fkey"
		}).onDelete("set null"),
]);

export const bankConnections = pgTable("bank_connections", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	institutionId: text("institution_id").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	teamId: uuid("team_id").notNull(),
	name: text().notNull(),
	logoUrl: text("logo_url"),
	accessToken: text("access_token"),
	enrollmentId: text("enrollment_id"),
	provider: bankProviders().notNull(),
	lastAccessed: timestamp("last_accessed", { withTimezone: true, mode: 'string' }),
	referenceId: text("reference_id"),
	status: connectionStatus().default('connected'),
	errorDetails: text("error_details"),
	errorRetries: smallint("error_retries").default(0),
}, (table) => [
	index("bank_connections_team_id_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "bank_connections_team_id_fkey"
		}).onDelete("cascade"),
	unique("unique_bank_connections").on(table.institutionId, table.teamId),
]);

export const bankAccounts = pgTable("bank_accounts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: uuid("created_by").notNull(),
	teamId: uuid("team_id").notNull(),
	name: text(),
	currency: text(),
	bankConnectionId: uuid("bank_connection_id"),
	enabled: boolean().default(true).notNull(),
	accountId: text("account_id").notNull(),
	balance: numeric({ precision: 10, scale:  2 }).default('0'),
	manual: boolean().default(false),
	type: accountType(),
	baseCurrency: text("base_currency"),
	baseBalance: numeric("base_balance", { precision: 10, scale:  2 }),
	errorDetails: text("error_details"),
	errorRetries: smallint("error_retries"),
	accountReference: text("account_reference"),
}, (table) => [
	index("bank_accounts_bank_connection_id_idx").using("btree", table.bankConnectionId.asc().nullsLast().op("uuid_ops")),
	index("bank_accounts_created_by_idx").using("btree", table.createdBy.asc().nullsLast().op("uuid_ops")),
	index("bank_accounts_team_id_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.bankConnectionId],
			foreignColumns: [bankConnections.id],
			name: "bank_accounts_bank_connection_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "bank_accounts_created_by_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "public_bank_accounts_team_id_fkey"
		}).onDelete("cascade"),
]);

export const transactions = pgTable("transactions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	date: date().notNull(),
	name: text().notNull(),
	method: transactionMethods().notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	currency: text().notNull(),
	teamId: uuid("team_id").notNull(),
	assignedId: uuid("assigned_id"),
	note: varchar(),
	bankAccountId: uuid("bank_account_id"),
	internalId: text("internal_id").notNull(),
	status: transactionStatus().default('posted'),
	balance: numeric({ precision: 10, scale:  2 }),
	manual: boolean().default(false),
	notified: boolean().default(false),
	internal: boolean().default(false),
	description: text(),
	categorySlug: text("category_slug"),
	baseAmount: numeric("base_amount", { precision: 10, scale:  2 }),
	counterpartyName: text("counterparty_name"),
	baseCurrency: text("base_currency"),
	taxAmount: numeric("tax_amount", { precision: 10, scale:  2 }),
	taxRate: numeric("tax_rate", { precision: 10, scale:  2 }),
	taxType: text("tax_type"),
	recurring: boolean(),
	frequency: transactionFrequency(),
	merchantName: text("merchant_name"),
	enrichmentCompleted: boolean("enrichment_completed").default(false),
	// TODO: failed to parse database type 'tsvector'
	ftsVector: unknown("fts_vector").notNull().generatedAlwaysAs(sql`to_tsvector('english'::regconfig, ((COALESCE(name, ''::text) || ' '::text) || COALESCE(description, ''::text)))`),
}, (table) => [
	index("idx_transactions_date").using("btree", table.date.asc().nullsLast().op("date_ops")),
	index("idx_transactions_fts").using("gin", table.ftsVector.asc().nullsLast().op("tsvector_ops")),
	index("idx_transactions_fts_vector").using("gin", table.ftsVector.asc().nullsLast().op("tsvector_ops")),
	index("idx_transactions_id").using("btree", table.id.asc().nullsLast().op("uuid_ops")),
	index("idx_transactions_name").using("btree", table.name.asc().nullsLast().op("text_ops")),
	index("idx_transactions_name_trigram").using("gin", table.name.asc().nullsLast().op("gin_trgm_ops")),
	index("idx_transactions_team_id_date_name").using("btree", table.teamId.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("date_ops"), table.name.asc().nullsLast().op("uuid_ops")),
	index("idx_transactions_team_id_name").using("btree", table.teamId.asc().nullsLast().op("uuid_ops"), table.name.asc().nullsLast().op("uuid_ops")),
	index("idx_trgm_name").using("gist", table.name.asc().nullsLast().op("gist_trgm_ops")),
	index("transactions_assigned_id_idx").using("btree", table.assignedId.asc().nullsLast().op("uuid_ops")),
	index("transactions_bank_account_id_idx").using("btree", table.bankAccountId.asc().nullsLast().op("uuid_ops")),
	index("transactions_category_slug_idx").using("btree", table.categorySlug.asc().nullsLast().op("text_ops")),
	index("transactions_team_id_date_currency_bank_account_id_category_idx").using("btree", table.teamId.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("date_ops"), table.currency.asc().nullsLast().op("date_ops"), table.bankAccountId.asc().nullsLast().op("date_ops")),
	index("transactions_team_id_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.assignedId],
			foreignColumns: [users.id],
			name: "public_transactions_assigned_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "public_transactions_team_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.bankAccountId],
			foreignColumns: [bankAccounts.id],
			name: "transactions_bank_account_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.teamId, table.categorySlug],
			foreignColumns: [transactionCategories.teamId, transactionCategories.slug],
			name: "transactions_category_slug_team_id_fkey"
		}),
	unique("transactions_internal_id_key").on(table.internalId),
]);

export const tags = pgTable("tags", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	teamId: uuid("team_id").notNull(),
	name: text().notNull(),
}, (table) => [
	index("tags_team_id_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "tags_team_id_fkey"
		}).onDelete("cascade"),
	unique("unique_tag_name").on(table.teamId, table.name),
]);

export const transactionTags = pgTable("transaction_tags", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	teamId: uuid("team_id").notNull(),
	tagId: uuid("tag_id").notNull(),
	transactionId: uuid("transaction_id").notNull(),
}, (table) => [
	index("transaction_tags_tag_id_idx").using("btree", table.tagId.asc().nullsLast().op("uuid_ops")),
	index("transaction_tags_team_id_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
	index("transaction_tags_transaction_id_tag_id_team_id_idx").using("btree", table.transactionId.asc().nullsLast().op("uuid_ops"), table.tagId.asc().nullsLast().op("uuid_ops"), table.teamId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tagId],
			foreignColumns: [tags.id],
			name: "transaction_tags_tag_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "transaction_tags_team_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.transactionId],
			foreignColumns: [transactions.id],
			name: "transaction_tags_transaction_id_fkey"
		}).onDelete("cascade"),
	unique("unique_tag").on(table.tagId, table.transactionId),
]);

export const transactionAttachments = pgTable("transaction_attachments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	type: text(),
	transactionId: uuid("transaction_id"),
	teamId: uuid("team_id"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	size: bigint({ mode: "number" }),
	name: text(),
	path: text().array(),
}, (table) => [
	index("transaction_attachments_team_id_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
	index("transaction_attachments_transaction_id_idx").using("btree", table.transactionId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "public_transaction_attachments_team_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.transactionId],
			foreignColumns: [transactions.id],
			name: "public_transaction_attachments_transaction_id_fkey"
		}).onDelete("set null"),
]);

export const customers = pgTable("customers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	billingEmail: text("billing_email"),
	country: text(),
	addressLine1: text("address_line_1"),
	addressLine2: text("address_line_2"),
	city: text(),
	state: text(),
	zip: text(),
	note: text(),
	teamId: uuid("team_id").defaultRandom().notNull(),
	website: text(),
	phone: text(),
	vatNumber: text("vat_number"),
	countryCode: text("country_code"),
	token: text().default(').notNull(),
	contact: text(),
	// TODO: failed to parse database type 'tsvector'
	fts: unknown("fts").notNull().generatedAlwaysAs(sql`to_tsvector('english'::regconfig, ((((((((((((((((((COALESCE(name, ''::text) || ' '::text) || COALESCE(contact, ''::text)) || ' '::text) || COALESCE(phone, ''::text)) || ' '::text) || COALESCE(email, ''::text)) || ' '::text) || COALESCE(address_line_1, ''::text)) || ' '::text) || COALESCE(address_line_2, ''::text)) || ' '::text) || COALESCE(city, ''::text)) || ' '::text) || COALESCE(state, ''::text)) || ' '::text) || COALESCE(zip, ''::text)) || ' '::text) || COALESCE(country, ''::text)))`),
}, (table) => [
	index("customers_fts").using("gin", table.fts.asc().nullsLast().op("tsvector_ops")),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "customers_team_id_fkey"
		}).onDelete("cascade"),
]);

export const customerTags = pgTable("customer_tags", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	customerId: uuid("customer_id").notNull(),
	teamId: uuid("team_id").notNull(),
	tagId: uuid("tag_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customers.id],
			name: "customer_tags_customer_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tagId],
			foreignColumns: [tags.id],
			name: "customer_tags_tag_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "customer_tags_team_id_fkey"
		}).onDelete("cascade"),
	unique("unique_customer_tag").on(table.customerId, table.tagId),
]);

export const invoices = pgTable("invoices", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	dueDate: timestamp("due_date", { withTimezone: true, mode: 'string' }),
	invoiceNumber: text("invoice_number"),
	customerId: uuid("customer_id"),
	amount: numeric({ precision: 10, scale:  2 }),
	currency: text(),
	lineItems: jsonb("line_items"),
	paymentDetails: jsonb("payment_details"),
	customerDetails: jsonb("customer_details"),
	companyDatails: jsonb("company_datails"),
	note: text(),
	internalNote: text("internal_note"),
	teamId: uuid("team_id").notNull(),
	paidAt: timestamp("paid_at", { withTimezone: true, mode: 'string' }),
	// TODO: failed to parse database type 'tsvector'
	fts: unknown("fts").notNull().generatedAlwaysAs(sql`to_tsvector('english'::regconfig, ((COALESCE((amount)::text, ''::text) || ' '::text) || COALESCE(invoice_number, ''::text)))`),
	vat: numeric({ precision: 10, scale:  2 }),
	tax: numeric({ precision: 10, scale:  2 }),
	url: text(),
	filePath: text("file_path").array(),
	status: invoiceStatus().default('draft').notNull(),
	viewedAt: timestamp("viewed_at", { withTimezone: true, mode: 'string' }),
	fromDetails: jsonb("from_details"),
	issueDate: timestamp("issue_date", { withTimezone: true, mode: 'string' }),
	template: jsonb(),
	noteDetails: jsonb("note_details"),
	customerName: text("customer_name"),
	token: text().default(').notNull(),
	sentTo: text("sent_to"),
	reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true, mode: 'string' }),
	discount: numeric({ precision: 10, scale:  2 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	fileSize: bigint("file_size", { mode: "number" }),
	userId: uuid("user_id"),
	subtotal: numeric({ precision: 10, scale:  2 }),
	topBlock: jsonb("top_block"),
	bottomBlock: jsonb("bottom_block"),
	sentAt: timestamp("sent_at", { withTimezone: true, mode: 'string' }),
	scheduledAt: timestamp("scheduled_at", { withTimezone: true, mode: 'string' }),
	scheduledJobId: text("scheduled_job_id"),
}, (table) => [
	index("invoices_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("invoices_fts").using("gin", table.fts.asc().nullsLast().op("tsvector_ops")),
	index("invoices_team_id_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "invoices_created_by_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customers.id],
			name: "invoices_customer_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "invoices_team_id_fkey"
		}).onDelete("cascade"),
	unique("invoices_scheduled_job_id_key").on(table.scheduledJobId),
]);

export const invoiceTemplates = pgTable("invoice_templates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	teamId: uuid("team_id").notNull(),
	customerLabel: text("customer_label"),
	fromLabel: text("from_label"),
	invoiceNoLabel: text("invoice_no_label"),
	issueDateLabel: text("issue_date_label"),
	dueDateLabel: text("due_date_label"),
	descriptionLabel: text("description_label"),
	priceLabel: text("price_label"),
	quantityLabel: text("quantity_label"),
	totalLabel: text("total_label"),
	vatLabel: text("vat_label"),
	taxLabel: text("tax_label"),
	paymentLabel: text("payment_label"),
	noteLabel: text("note_label"),
	logoUrl: text("logo_url"),
	currency: text(),
	paymentDetails: jsonb("payment_details"),
	fromDetails: jsonb("from_details"),
	noteDetails: jsonb("note_details"),
	size: invoiceSize().default('a4'),
	dateFormat: text("date_format"),
	includeVat: boolean("include_vat"),
	includeTax: boolean("include_tax"),
	taxRate: numeric("tax_rate", { precision: 10, scale:  2 }),
	deliveryType: invoiceDeliveryType("delivery_type").default('create').notNull(),
	discountLabel: text("discount_label"),
	includeDiscount: boolean("include_discount"),
	includeDecimals: boolean("include_decimals"),
	includeQr: boolean("include_qr"),
	totalSummaryLabel: text("total_summary_label"),
	title: text(),
	vatRate: numeric("vat_rate", { precision: 10, scale:  2 }),
	includeUnits: boolean("include_units"),
	subtotalLabel: text("subtotal_label"),
	includePdf: boolean("include_pdf"),
	sendCopy: boolean("send_copy"),
}, (table) => [
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "invoice_settings_team_id_fkey"
		}).onDelete("cascade"),
	unique("invoice_templates_team_id_key").on(table.teamId),
]);

export const invoiceProducts = pgTable("invoice_products", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	teamId: uuid("team_id").notNull(),
	createdBy: uuid("created_by"),
	name: text().notNull(),
	description: text(),
	price: numeric({ precision: 10, scale:  2 }),
	currency: text(),
	unit: text(),
	isActive: boolean("is_active").default(true).notNull(),
	usageCount: integer("usage_count").default(0).notNull(),
	lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: 'string' }),
	// TODO: failed to parse database type 'tsvector'
	fts: unknown("fts").notNull().generatedAlwaysAs(sql`to_tsvector('english'::regconfig, ((COALESCE(name, ''::text) || ' '::text) || COALESCE(description, ''::text)))`),
}, (table) => [
	index("invoice_products_created_by_idx").using("btree", table.createdBy.asc().nullsLast().op("uuid_ops")),
	index("invoice_products_fts_idx").using("gin", table.fts.asc().nullsLast().op("tsvector_ops")),
	index("invoice_products_last_used_at_idx").using("btree", table.lastUsedAt.asc().nullsLast().op("timestamptz_ops")),
	index("invoice_products_name_idx").using("btree", table.name.asc().nullsLast().op("text_ops")),
	index("invoice_products_team_active_idx").using("btree", table.teamId.asc().nullsLast().op("bool_ops"), table.isActive.asc().nullsLast().op("uuid_ops")),
	index("invoice_products_team_id_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
	index("invoice_products_usage_count_idx").using("btree", table.usageCount.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "invoice_products_created_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "invoice_products_team_id_fkey"
		}).onDelete("cascade"),
	unique("invoice_products_team_name_currency_price_unique").on(table.teamId, table.name, table.price, table.currency),
]);

export const invoiceComments = pgTable("invoice_comments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const trackerProjects = pgTable("tracker_projects", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	teamId: uuid("team_id"),
	rate: numeric({ precision: 10, scale:  2 }),
	currency: text(),
	status: trackerStatus().default('in_progress').notNull(),
	description: text(),
	name: text().notNull(),
	billable: boolean().default(false),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	estimate: bigint({ mode: "number" }),
	customerId: uuid("customer_id"),
	// TODO: failed to parse database type 'tsvector'
	fts: unknown("fts").notNull().generatedAlwaysAs(sql`to_tsvector('english'::regconfig, ((COALESCE(name, ''::text) || ' '::text) || COALESCE(description, ''::text)))`),
}, (table) => [
	index("tracker_projects_fts").using("gin", table.fts.asc().nullsLast().op("tsvector_ops")),
	index("tracker_projects_team_id_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customers.id],
			name: "tracker_projects_customer_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "tracker_projects_team_id_fkey"
		}).onDelete("cascade"),
]);

export const trackerEntries = pgTable("tracker_entries", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	duration: bigint({ mode: "number" }),
	projectId: uuid("project_id"),
	start: timestamp({ withTimezone: true, mode: 'string' }),
	stop: timestamp({ withTimezone: true, mode: 'string' }),
	assignedId: uuid("assigned_id"),
	teamId: uuid("team_id"),
	description: text(),
	rate: numeric({ precision: 10, scale:  2 }),
	currency: text(),
	billed: boolean().default(false),
	date: date().defaultNow(),
}, (table) => [
	index("tracker_entries_team_id_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.assignedId],
			foreignColumns: [users.id],
			name: "tracker_entries_assigned_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [trackerProjects.id],
			name: "tracker_entries_project_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "tracker_entries_team_id_fkey"
		}).onDelete("cascade"),
]);

export const trackerProjectTags = pgTable("tracker_project_tags", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	trackerProjectId: uuid("tracker_project_id").notNull(),
	tagId: uuid("tag_id").notNull(),
	teamId: uuid("team_id").notNull(),
}, (table) => [
	index("tracker_project_tags_team_id_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
	index("tracker_project_tags_tracker_project_id_tag_id_team_id_idx").using("btree", table.trackerProjectId.asc().nullsLast().op("uuid_ops"), table.tagId.asc().nullsLast().op("uuid_ops"), table.teamId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tagId],
			foreignColumns: [tags.id],
			name: "project_tags_tag_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.trackerProjectId],
			foreignColumns: [trackerProjects.id],
			name: "project_tags_tracker_project_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "tracker_project_tags_team_id_fkey"
		}).onDelete("cascade"),
	unique("unique_project_tag").on(table.trackerProjectId, table.tagId),
]);

export const trackerReports = pgTable("tracker_reports", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	linkId: text("link_id"),
	shortLink: text("short_link"),
	teamId: uuid("team_id").defaultRandom(),
	projectId: uuid("project_id").defaultRandom(),
	createdBy: uuid("created_by"),
}, (table) => [
	index("tracker_reports_team_id_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "public_tracker_reports_created_by_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [trackerProjects.id],
			name: "public_tracker_reports_project_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "tracker_reports_team_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const reports = pgTable("reports", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	linkId: text("link_id"),
	teamId: uuid("team_id"),
	shortLink: text("short_link"),
	from: timestamp({ withTimezone: true, mode: 'string' }),
	to: timestamp({ withTimezone: true, mode: 'string' }),
	type: reportTypes(),
	expireAt: timestamp("expire_at", { withTimezone: true, mode: 'string' }),
	currency: text(),
	createdBy: uuid("created_by"),
}, (table) => [
	index("reports_team_id_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "public_reports_created_by_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "reports_team_id_fkey"
		}).onDelete("cascade"),
]);

export const inboxAccounts = pgTable("inbox_accounts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	email: text().notNull(),
	accessToken: text("access_token").notNull(),
	refreshToken: text("refresh_token").notNull(),
	teamId: uuid("team_id").notNull(),
	lastAccessed: timestamp("last_accessed", { withTimezone: true, mode: 'string' }).notNull(),
	provider: inboxAccountProviders().notNull(),
	externalId: text("external_id").notNull(),
	expiryDate: timestamp("expiry_date", { withTimezone: true, mode: 'string' }).notNull(),
	scheduleId: text("schedule_id"),
	status: inboxAccountStatus().default('connected').notNull(),
	errorMessage: text("error_message"),
}, (table) => [
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "inbox_accounts_team_id_fkey"
		}).onDelete("cascade"),
	unique("inbox_accounts_email_key").on(table.email),
	unique("inbox_accounts_external_id_key").on(table.externalId),
]);

export const inbox = pgTable("inbox", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	teamId: uuid("team_id"),
	filePath: text("file_path").array(),
	fileName: text("file_name"),
	transactionId: uuid("transaction_id"),
	amount: numeric({ precision: 10, scale:  2 }),
	currency: text(),
	contentType: text("content_type"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	size: bigint({ mode: "number" }),
	attachmentId: uuid("attachment_id"),
	date: date(),
	forwardedTo: text("forwarded_to"),
	referenceId: text("reference_id"),
	meta: json(),
	status: inboxStatus().default('new'),
	website: text(),
	senderEmail: text("sender_email"),
	displayName: text("display_name"),
	// TODO: failed to parse database type 'tsvector'
	fts: unknown("fts").notNull().generatedAlwaysAs(sql`generate_inbox_fts(display_name, extract_product_names((meta -> 'products'::text)))`),
	type: inboxType(),
	description: text(),
	baseAmount: numeric("base_amount", { precision: 10, scale:  2 }),
	baseCurrency: text("base_currency"),
	taxAmount: numeric("tax_amount", { precision: 10, scale:  2 }),
	taxRate: numeric("tax_rate", { precision: 10, scale:  2 }),
	taxType: text("tax_type"),
	inboxAccountId: uuid("inbox_account_id"),
	invoiceNumber: text("invoice_number"),
	groupedInboxId: uuid("grouped_inbox_id"),
}, (table) => [
	index("inbox_attachment_id_idx").using("btree", table.attachmentId.asc().nullsLast().op("uuid_ops")),
	index("inbox_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("inbox_grouped_inbox_id_idx").using("btree", table.groupedInboxId.asc().nullsLast().op("uuid_ops")),
	index("inbox_inbox_account_id_idx").using("btree", table.inboxAccountId.asc().nullsLast().op("uuid_ops")),
	index("inbox_invoice_number_idx").using("btree", table.invoiceNumber.asc().nullsLast().op("text_ops")),
	index("inbox_team_id_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
	index("inbox_transaction_id_idx").using("btree", table.transactionId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.attachmentId],
			foreignColumns: [transactionAttachments.id],
			name: "inbox_attachment_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.inboxAccountId],
			foreignColumns: [inboxAccounts.id],
			name: "inbox_inbox_account_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "public_inbox_team_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.transactionId],
			foreignColumns: [transactions.id],
			name: "public_inbox_transaction_id_fkey"
		}).onDelete("set null"),
	unique("inbox_reference_id_key").on(table.referenceId),
]);

export const inboxBlocklist = pgTable("inbox_blocklist", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	teamId: uuid("team_id").notNull(),
	type: inboxBlocklistType().notNull(),
	value: text().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "inbox_blocklist_team_id_fkey"
		}).onDelete("cascade"),
	unique("inbox_blocklist_team_id_type_value_key").on(table.teamId, table.type, table.value),
]);

export const documents = pgTable("documents", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	metadata: jsonb(),
	pathTokens: text("path_tokens").array(),
	teamId: uuid("team_id"),
	parentId: text("parent_id"),
	objectId: uuid("object_id"),
	ownerId: uuid("owner_id"),
	tag: text(),
	title: text(),
	body: text(),
	// TODO: failed to parse database type 'tsvector'
	fts: unknown("fts").notNull().generatedAlwaysAs(sql`to_tsvector('english'::regconfig, ((COALESCE(title, ''::text) || ' '::text) || COALESCE(body, ''::text)))`),
	summary: text(),
	content: text(),
	date: date(),
	language: text(),
	processingStatus: documentProcessingStatus("processing_status").default('pending'),
	// TODO: failed to parse database type 'tsvector'
	ftsSimple: unknown("fts_simple"),
	// TODO: failed to parse database type 'tsvector'
	ftsEnglish: unknown("fts_english"),
	// TODO: failed to parse database type 'tsvector'
	ftsLanguage: unknown("fts_language"),
}, (table) => [
	index("documents_name_idx").using("btree", table.name.asc().nullsLast().op("text_ops")),
	index("documents_team_id_created_at_idx").using("btree", table.teamId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	index("documents_team_id_date_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops"), table.date.asc().nullsLast().op("uuid_ops")),
	index("documents_team_id_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
	index("documents_team_id_name_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops"), table.name.asc().nullsLast().op("text_ops")),
	index("documents_team_id_parent_id_idx").using("btree", table.teamId.asc().nullsLast().op("text_ops"), table.parentId.asc().nullsLast().op("uuid_ops")),
	index("idx_documents_fts_english").using("gin", table.ftsEnglish.asc().nullsLast().op("tsvector_ops")),
	index("idx_documents_fts_language").using("gin", table.ftsLanguage.asc().nullsLast().op("tsvector_ops")),
	index("idx_documents_fts_simple").using("gin", table.ftsSimple.asc().nullsLast().op("tsvector_ops")),
	index("idx_gin_documents_name").using("gin", table.name.asc().nullsLast().op("gin_trgm_ops")),
	index("idx_gin_documents_title").using("gin", table.title.asc().nullsLast().op("gin_trgm_ops")),
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [users.id],
			name: "documents_created_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "storage_team_id_fkey"
		}).onDelete("cascade"),
]);

export const documentTags = pgTable("document_tags", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	teamId: uuid("team_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "document_tags_team_id_fkey"
		}).onDelete("cascade"),
	unique("unique_slug_per_team").on(table.slug, table.teamId),
]);

export const documentTagEmbeddings = pgTable("document_tag_embeddings", {
	slug: text().primaryKey().notNull(),
	embedding: vector({ dimensions: 768 }),
	name: text().notNull(),
	model: text().default('gemini-embedding-001').notNull(),
}, (table) => [
	index("document_tag_embeddings_idx").using("hnsw", table.embedding.asc().nullsLast().op("vector_cosine_ops")).with({m: "16",ef_construction: "64"}),
]);

export const transactionCategoryEmbeddings = pgTable("transaction_category_embeddings", {
	name: text().primaryKey().notNull(),
	embedding: vector({ dimensions: 768 }),
	model: text().default('gemini-embedding-001').notNull(),
	system: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("transaction_category_embeddings_system_idx").using("btree", table.system.asc().nullsLast().op("bool_ops")),
	index("transaction_category_embeddings_vector_idx").using("hnsw", table.embedding.asc().nullsLast().op("vector_cosine_ops")).with({m: "16",ef_construction: "64"}),
]);

export const transactionEmbeddings = pgTable("transaction_embeddings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	transactionId: uuid("transaction_id").notNull(),
	teamId: uuid("team_id").notNull(),
	embedding: vector({ dimensions: 768 }),
	sourceText: text("source_text").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	model: text().default('gemini-embedding-001').notNull(),
}, (table) => [
	index("transaction_embeddings_team_id_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
	index("transaction_embeddings_transaction_id_idx").using("btree", table.transactionId.asc().nullsLast().op("uuid_ops")),
	index("transaction_embeddings_vector_idx").using("hnsw", table.embedding.asc().nullsLast().op("vector_cosine_ops")),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "transaction_embeddings_team_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.transactionId],
			foreignColumns: [transactions.id],
			name: "transaction_embeddings_transaction_id_fkey"
		}).onDelete("cascade"),
	unique("transaction_embeddings_unique").on(table.transactionId),
]);

export const inboxEmbeddings = pgTable("inbox_embeddings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	inboxId: uuid("inbox_id").notNull(),
	teamId: uuid("team_id").notNull(),
	embedding: vector({ dimensions: 768 }),
	sourceText: text("source_text").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	model: text().default('gemini-embedding-001').notNull(),
}, (table) => [
	index("inbox_embeddings_inbox_id_idx").using("btree", table.inboxId.asc().nullsLast().op("uuid_ops")),
	index("inbox_embeddings_team_id_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
	index("inbox_embeddings_vector_idx").using("hnsw", table.embedding.asc().nullsLast().op("vector_cosine_ops")),
	foreignKey({
			columns: [table.inboxId],
			foreignColumns: [inbox.id],
			name: "inbox_embeddings_inbox_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "inbox_embeddings_team_id_fkey"
		}).onDelete("cascade"),
	unique("inbox_embeddings_unique").on(table.inboxId),
]);

export const transactionMatchSuggestions = pgTable("transaction_match_suggestions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	teamId: uuid("team_id").notNull(),
	inboxId: uuid("inbox_id").notNull(),
	transactionId: uuid("transaction_id").notNull(),
	confidenceScore: numeric("confidence_score", { precision: 4, scale:  3 }).notNull(),
	amountScore: numeric("amount_score", { precision: 4, scale:  3 }),
	currencyScore: numeric("currency_score", { precision: 4, scale:  3 }),
	dateScore: numeric("date_score", { precision: 4, scale:  3 }),
	embeddingScore: numeric("embedding_score", { precision: 4, scale:  3 }),
	nameScore: numeric("name_score", { precision: 4, scale:  3 }),
	matchType: text("match_type").notNull(),
	matchDetails: jsonb("match_details"),
	status: text().default('pending').notNull(),
	userActionAt: timestamp("user_action_at", { withTimezone: true, mode: 'string' }),
	userId: uuid("user_id"),
}, (table) => [
	index("transaction_match_suggestions_confidence_idx").using("btree", table.confidenceScore.desc().nullsFirst().op("numeric_ops")),
	index("transaction_match_suggestions_inbox_id_idx").using("btree", table.inboxId.asc().nullsLast().op("uuid_ops")),
	index("transaction_match_suggestions_lookup_idx").using("btree", table.transactionId.asc().nullsLast().op("uuid_ops"), table.teamId.asc().nullsLast().op("uuid_ops"), table.status.asc().nullsLast().op("uuid_ops")),
	index("transaction_match_suggestions_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("transaction_match_suggestions_team_id_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
	index("transaction_match_suggestions_transaction_id_idx").using("btree", table.transactionId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.inboxId],
			foreignColumns: [inbox.id],
			name: "transaction_match_suggestions_inbox_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "transaction_match_suggestions_team_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.transactionId],
			foreignColumns: [transactions.id],
			name: "transaction_match_suggestions_transaction_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "transaction_match_suggestions_user_id_fkey"
		}).onDelete("set null"),
	unique("transaction_match_suggestions_unique").on(table.inboxId, table.transactionId),
]);

export const transactionEnrichments = pgTable("transaction_enrichments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	name: text(),
	teamId: uuid("team_id"),
	categorySlug: text("category_slug"),
	system: boolean().default(false),
}, (table) => [
	index("transaction_enrichments_category_slug_team_id_idx").using("btree", table.categorySlug.asc().nullsLast().op("text_ops"), table.teamId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.teamId, table.categorySlug],
			foreignColumns: [transactionCategories.teamId, transactionCategories.slug],
			name: "transaction_enrichments_category_slug_team_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "transaction_enrichments_team_id_fkey"
		}).onDelete("cascade"),
	unique("unique_team_name").on(table.name, table.teamId),
]);

export const exchangeRates = pgTable("exchange_rates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	base: text(),
	rate: numeric({ precision: 10, scale:  2 }),
	target: text(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("exchange_rates_base_target_idx").using("btree", table.base.asc().nullsLast().op("text_ops"), table.target.asc().nullsLast().op("text_ops")),
	unique("unique_rate").on(table.base, table.target),
]);

export const userInvites = pgTable("user_invites", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	teamId: uuid("team_id"),
	email: text(),
	role: teamRoles(),
	code: text().default(encode(gen_random_bytes(18), \'base64\'::text)),
	invitedBy: uuid("invited_by"),
}, (table) => [
	index("user_invites_team_id_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "public_user_invites_team_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.invitedBy],
			foreignColumns: [users.id],
			name: "user_invites_invited_by_fkey"
		}).onDelete("cascade"),
	unique("unique_team_invite").on(table.teamId, table.email),
	unique("user_invites_code_key").on(table.code),
]);

export const apps = pgTable("apps", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	teamId: uuid("team_id").defaultRandom(),
	config: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	appId: text("app_id").notNull(),
	createdBy: uuid("created_by").defaultRandom(),
	settings: jsonb(),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "apps_created_by_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "integrations_team_id_fkey"
		}).onDelete("cascade"),
	unique("unique_app_id_team_id").on(table.teamId, table.appId),
]);

export const apiKeys = pgTable("api_keys", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	keyEncrypted: text("key_encrypted").notNull(),
	name: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	userId: uuid("user_id").notNull(),
	teamId: uuid("team_id").notNull(),
	keyHash: text("key_hash"),
	scopes: text().array().default([""]).notNull(),
	lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("api_keys_key_idx").using("btree", table.keyHash.asc().nullsLast().op("text_ops")),
	index("api_keys_team_id_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
	index("api_keys_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "api_keys_team_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "api_keys_user_id_fkey"
		}).onDelete("cascade"),
	unique("api_keys_key_unique").on(table.keyHash),
]);

export const shortLinks = pgTable("short_links", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	shortId: text("short_id").notNull(),
	url: text().notNull(),
	type: text(),
	size: numeric({ precision: 10, scale:  2 }),
	mimeType: text("mime_type"),
	fileName: text("file_name"),
	teamId: uuid("team_id").notNull(),
	userId: uuid("user_id").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("short_links_short_id_idx").using("btree", table.shortId.asc().nullsLast().op("text_ops")),
	index("short_links_team_id_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
	index("short_links_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "short_links_team_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "short_links_user_id_fkey"
		}).onDelete("cascade"),
	unique("short_links_short_id_unique").on(table.shortId),
]);

export const oauthApplications = pgTable("oauth_applications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	description: text(),
	overview: text(),
	developerName: text("developer_name"),
	logoUrl: text("logo_url"),
	website: text(),
	installUrl: text("install_url"),
	screenshots: text().array().default([""]),
	redirectUris: text("redirect_uris").array().notNull(),
	clientId: text("client_id").notNull(),
	clientSecret: text("client_secret").notNull(),
	scopes: text().array().default([""]).notNull(),
	teamId: uuid("team_id").notNull(),
	createdBy: uuid("created_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	isPublic: boolean("is_public").default(false),
	active: boolean().default(true),
	status: text().default('draft'),
}, (table) => [
	index("oauth_applications_client_id_idx").using("btree", table.clientId.asc().nullsLast().op("text_ops")),
	index("oauth_applications_slug_idx").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	index("oauth_applications_team_id_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "oauth_applications_created_by_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "oauth_applications_team_id_fkey"
		}).onDelete("cascade"),
	unique("oauth_applications_slug_key").on(table.slug),
	unique("oauth_applications_client_id_key").on(table.clientId),
]);

export const oauthAuthorizationCodes = pgTable("oauth_authorization_codes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: text().notNull(),
	applicationId: uuid("application_id").notNull(),
	userId: uuid("user_id").notNull(),
	teamId: uuid("team_id").notNull(),
	scopes: text().array().notNull(),
	redirectUri: text("redirect_uri").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	used: boolean().default(false),
	codeChallenge: text("code_challenge"),
	codeChallengeMethod: text("code_challenge_method"),
}, (table) => [
	index("oauth_authorization_codes_application_id_idx").using("btree", table.applicationId.asc().nullsLast().op("uuid_ops")),
	index("oauth_authorization_codes_code_idx").using("btree", table.code.asc().nullsLast().op("text_ops")),
	index("oauth_authorization_codes_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.applicationId],
			foreignColumns: [oauthApplications.id],
			name: "oauth_authorization_codes_application_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "oauth_authorization_codes_team_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "oauth_authorization_codes_user_id_fkey"
		}).onDelete("cascade"),
	unique("oauth_authorization_codes_code_key").on(table.code),
]);

export const oauthAccessTokens = pgTable("oauth_access_tokens", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	token: text().notNull(),
	refreshToken: text("refresh_token"),
	applicationId: uuid("application_id").notNull(),
	userId: uuid("user_id").notNull(),
	teamId: uuid("team_id").notNull(),
	scopes: text().array().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: 'string' }),
	revoked: boolean().default(false),
	revokedAt: timestamp("revoked_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("oauth_access_tokens_application_id_idx").using("btree", table.applicationId.asc().nullsLast().op("uuid_ops")),
	index("oauth_access_tokens_refresh_token_idx").using("btree", table.refreshToken.asc().nullsLast().op("text_ops")),
	index("oauth_access_tokens_token_idx").using("btree", table.token.asc().nullsLast().op("text_ops")),
	index("oauth_access_tokens_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.applicationId],
			foreignColumns: [oauthApplications.id],
			name: "oauth_access_tokens_application_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "oauth_access_tokens_team_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "oauth_access_tokens_user_id_fkey"
		}).onDelete("cascade"),
	unique("oauth_access_tokens_token_key").on(table.token),
	unique("oauth_access_tokens_refresh_token_key").on(table.refreshToken),
]);

export const activities = pgTable("activities", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	teamId: uuid("team_id").notNull(),
	userId: uuid("user_id"),
	type: activityType().notNull(),
	priority: smallint().default(5),
	groupId: uuid("group_id"),
	source: activitySource().notNull(),
	metadata: jsonb().notNull(),
	status: activityStatus().default('unread').notNull(),
	lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("activities_group_id_idx").using("btree", table.groupId.asc().nullsLast().op("uuid_ops")),
	index("activities_insights_group_idx").using("btree", table.teamId.asc().nullsLast().op("timestamptz_ops"), table.groupId.asc().nullsLast().op("enum_ops"), table.type.asc().nullsLast().op("enum_ops"), table.createdAt.desc().nullsFirst().op("enum_ops")),
	index("activities_insights_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops"), table.type.asc().nullsLast().op("uuid_ops"), table.source.asc().nullsLast().op("enum_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("activities_metadata_gin_idx").using("gin", table.metadata.asc().nullsLast().op("jsonb_ops")),
	index("activities_notifications_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops"), table.priority.asc().nullsLast().op("int2_ops"), table.status.asc().nullsLast().op("int2_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "activities_team_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "activities_user_id_fkey"
		}).onDelete("set null"),
]);

export const notificationSettings = pgTable("notification_settings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	teamId: uuid("team_id").notNull(),
	notificationType: text("notification_type").notNull(),
	channel: text().notNull(),
	enabled: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("notification_settings_type_channel_idx").using("btree", table.notificationType.asc().nullsLast().op("text_ops"), table.channel.asc().nullsLast().op("text_ops")),
	index("notification_settings_user_team_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.teamId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "notification_settings_team_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "notification_settings_user_id_fkey"
		}).onDelete("cascade"),
	unique("notification_settings_user_team_type_channel_key").on(table.userId, table.teamId, table.notificationType, table.channel),
]);

export const documentTagAssignments = pgTable("document_tag_assignments", {
	documentId: uuid("document_id").notNull(),
	tagId: uuid("tag_id").notNull(),
	teamId: uuid("team_id").notNull(),
}, (table) => [
	index("idx_document_tag_assignments_document_id").using("btree", table.documentId.asc().nullsLast().op("uuid_ops")),
	index("idx_document_tag_assignments_tag_id").using("btree", table.tagId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.documentId],
			foreignColumns: [documents.id],
			name: "document_tag_assignments_document_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tagId],
			foreignColumns: [documentTags.id],
			name: "document_tag_assignments_tag_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "document_tag_assignments_team_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.documentId, table.tagId], name: "document_tag_assignments_unique"}),
]);

export const usersOnTeam = pgTable("users_on_team", {
	userId: uuid("user_id").notNull(),
	teamId: uuid("team_id").notNull(),
	id: uuid().defaultRandom().notNull(),
	role: teamRoles(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("users_on_team_team_id_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
	index("users_on_team_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "users_on_team_team_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "users_on_team_user_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.userId, table.teamId, table.id], name: "users_on_team_pkey"}),
]);

export const transactionCategories = pgTable("transaction_categories", {
	id: uuid().defaultRandom().notNull(),
	name: text().notNull(),
	teamId: uuid("team_id").notNull(),
	color: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	system: boolean().default(false),
	slug: text().notNull(),
	taxRate: numeric("tax_rate", { precision: 10, scale:  2 }),
	taxType: text("tax_type"),
	taxReportingCode: text("tax_reporting_code"),
	excluded: boolean().default(false),
	description: text(),
	parentId: uuid("parent_id"),
}, (table) => [
	index("transaction_categories_parent_id_idx").using("btree", table.parentId.asc().nullsLast().op("uuid_ops")),
	index("transaction_categories_team_id_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "transaction_categories_parent_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "transaction_categories_team_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.teamId, table.slug], name: "unique_team_slug"}),
	unique("transaction_categories_id_unique").on(table.id),
]);
