CREATE TABLE `triage_auth_users` (
  `id` text PRIMARY KEY NOT NULL,
  `display_name` text NOT NULL,
  `email` text NOT NULL,
  `password_hash` text NOT NULL,
  `created_at` integer NOT NULL
);
CREATE UNIQUE INDEX `triage_auth_users_email_idx` ON `triage_auth_users` (`email`);
CREATE TABLE `triage_auth_sessions` (
  `token_hash` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `expires_at` integer NOT NULL,
  `created_at` integer NOT NULL
);
CREATE INDEX `triage_auth_sessions_user_idx` ON `triage_auth_sessions` (`user_id`);
CREATE INDEX `triage_auth_sessions_expires_idx` ON `triage_auth_sessions` (`expires_at`);
