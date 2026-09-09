CREATE TABLE `crm_leads` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text DEFAULT 'Empresa' NOT NULL,
	`search_segment` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`phone_e164` text DEFAULT '' NOT NULL,
	`phone_type` text DEFAULT 'unknown' NOT NULL,
	`whatsapp_status` text DEFAULT 'unavailable' NOT NULL,
	`whatsapp_id` text,
	`email` text DEFAULT '' NOT NULL,
	`website` text DEFAULT '' NOT NULL,
	`instagram` text DEFAULT '' NOT NULL,
	`facebook` text DEFAULT '' NOT NULL,
	`linkedin` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`rating_x10` integer,
	`review_count` integer DEFAULT 0 NOT NULL,
	`google_maps_url` text DEFAULT '' NOT NULL,
	`latitude` text,
	`longitude` text,
	`business_status` text DEFAULT 'OPERATIONAL' NOT NULL,
	`pipeline_status` text DEFAULT 'novo' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `site_samples` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`slug` text NOT NULL,
	`company_name` text NOT NULL,
	`segment` text DEFAULT 'Empresa' NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`template` text DEFAULT 'moderno' NOT NULL,
	`primary_color` text DEFAULT '#1769e0' NOT NULL,
	`status` text DEFAULT 'pronto' NOT NULL,
	`pipeline_status` text DEFAULT 'pronto_revisar' NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `site_samples_slug_unique` ON `site_samples` (`slug`);