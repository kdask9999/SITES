CREATE TABLE `api_usage_monthly` (
	`month` text PRIMARY KEY NOT NULL,
	`search_actions` integer DEFAULT 0 NOT NULL,
	`text_search_pro_requests` integer DEFAULT 0 NOT NULL,
	`text_search_enterprise_requests` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
