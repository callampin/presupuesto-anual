CREATE TABLE `annual_goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`year` integer NOT NULL,
	`description` text NOT NULL,
	`target_amount` real,
	`is_completed` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`year`) REFERENCES `years`(`year`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `annual_goals_year_idx` ON `annual_goals` (`year`,`sort_order`);--> statement-breakpoint
CREATE TABLE `catalog_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`section` text NOT NULL,
	`name` text NOT NULL,
	`default_amount` real DEFAULT 0 NOT NULL,
	`default_day_of_month` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `catalog_items_section_idx` ON `catalog_items` (`section`,`sort_order`);--> statement-breakpoint
CREATE TABLE `compound_simulations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`initial_capital` real NOT NULL,
	`monthly_rate` real NOT NULL,
	`months` integer DEFAULT 24 NOT NULL,
	`monthly_contribution` real DEFAULT 0 NOT NULL,
	`withdrawals_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `expense_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`period_id` integer NOT NULL,
	`expense_category_id` integer NOT NULL,
	`amount` real NOT NULL,
	`date` text,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`period_id`) REFERENCES `monthly_periods`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`expense_category_id`) REFERENCES `monthly_expense_categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `expense_transactions_period_idx` ON `expense_transactions` (`period_id`);--> statement-breakpoint
CREATE INDEX `expense_transactions_category_idx` ON `expense_transactions` (`expense_category_id`);--> statement-breakpoint
CREATE TABLE `monthly_bills` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`period_id` integer NOT NULL,
	`catalog_item_id` integer,
	`name` text NOT NULL,
	`due_date` text,
	`is_paid` integer DEFAULT false NOT NULL,
	`budget_amount` real DEFAULT 0 NOT NULL,
	`actual_amount` real DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`period_id`) REFERENCES `monthly_periods`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`catalog_item_id`) REFERENCES `catalog_items`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `monthly_bills_period_idx` ON `monthly_bills` (`period_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `monthly_debts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`period_id` integer NOT NULL,
	`catalog_item_id` integer,
	`name` text NOT NULL,
	`expected_amount` real DEFAULT 0 NOT NULL,
	`actual_amount` real DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`period_id`) REFERENCES `monthly_periods`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`catalog_item_id`) REFERENCES `catalog_items`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `monthly_debts_period_idx` ON `monthly_debts` (`period_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `monthly_expense_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`period_id` integer NOT NULL,
	`catalog_item_id` integer,
	`name` text NOT NULL,
	`budget_amount` real DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`period_id`) REFERENCES `monthly_periods`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`catalog_item_id`) REFERENCES `catalog_items`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `monthly_expense_categories_period_idx` ON `monthly_expense_categories` (`period_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `monthly_incomes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`period_id` integer NOT NULL,
	`catalog_item_id` integer,
	`name` text NOT NULL,
	`date` text,
	`expected_amount` real DEFAULT 0 NOT NULL,
	`actual_amount` real DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`period_id`) REFERENCES `monthly_periods`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`catalog_item_id`) REFERENCES `catalog_items`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `monthly_incomes_period_idx` ON `monthly_incomes` (`period_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `monthly_periods` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`year` integer NOT NULL,
	`month` integer NOT NULL,
	`is_initialized` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`year`) REFERENCES `years`(`year`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `monthly_periods_year_month_unique` ON `monthly_periods` (`year`,`month`);--> statement-breakpoint
CREATE TABLE `monthly_savings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`period_id` integer NOT NULL,
	`catalog_item_id` integer,
	`name` text NOT NULL,
	`projected_amount` real DEFAULT 0 NOT NULL,
	`actual_amount` real DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`period_id`) REFERENCES `monthly_periods`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`catalog_item_id`) REFERENCES `catalog_items`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `monthly_savings_period_idx` ON `monthly_savings` (`period_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`currency_symbol` text DEFAULT '$' NOT NULL,
	`currency_code` text DEFAULT 'USD' NOT NULL,
	`locale` text DEFAULT 'es-MX' NOT NULL,
	`decimal_places` integer DEFAULT 2 NOT NULL,
	`default_year` integer
);
--> statement-breakpoint
CREATE TABLE `years` (
	`year` integer PRIMARY KEY NOT NULL,
	`goals_title` text DEFAULT 'MIS METAS FINANCIERAS' NOT NULL,
	`notes_title` text DEFAULT 'NOTAS' NOT NULL,
	`notes_content` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
