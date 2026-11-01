-- CreateTable
CREATE TABLE `flags` (
    `id` CHAR(26) NOT NULL,
    `project_id` CHAR(26) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `description` VARCHAR(1024) NOT NULL DEFAULT '',
    `version` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,

    UNIQUE INDEX `flags_project_id_key_key`(`project_id`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `flag_definitions` (
    `id` CHAR(26) NOT NULL,
    `flag_id` CHAR(26) NOT NULL,
    `env` VARCHAR(64) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `variants` JSON NOT NULL,
    `default_variant` VARCHAR(64) NOT NULL,
    `rules` JSON NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,

    UNIQUE INDEX `flag_definitions_flag_id_env_key`(`flag_id`, `env`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `api_keys` (
    `id` CHAR(26) NOT NULL,
    `name` VARCHAR(128) NOT NULL,
    `key_hash` CHAR(64) NOT NULL,
    `key_prefix` VARCHAR(8) NOT NULL,
    `scope` ENUM('MANAGE', 'EVALUATE', 'SYNC', 'ALL') NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `last_used_at` DATETIME(6) NULL,
    `revoked_at` DATETIME(6) NULL,
    `created_by` VARCHAR(128) NOT NULL,

    UNIQUE INDEX `api_keys_key_hash_key`(`key_hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` CHAR(26) NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `actorType` ENUM('SESSION', 'API_KEY') NOT NULL,
    `actor_name` VARCHAR(128) NOT NULL,
    `action` VARCHAR(64) NOT NULL,
    `entity` VARCHAR(32) NOT NULL,
    `entity_id` VARCHAR(256) NOT NULL,
    `env` VARCHAR(64) NULL,
    `before` JSON NULL,
    `after` JSON NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projects` (
    `id` CHAR(26) NOT NULL,
    `key` VARCHAR(128) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,

    UNIQUE INDEX `projects_key_key`(`key`),
    UNIQUE INDEX `projects_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_environments` (
    `project_id` CHAR(26) NOT NULL,
    `env` VARCHAR(64) NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,

    PRIMARY KEY (`project_id`, `env`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `user_name` VARCHAR(128) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `globalRole` ENUM('ADMIN', 'DEVELOPER', 'PRODUCT_OWNER') NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (`user_name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_memberships` (
    `user_name` VARCHAR(128) NOT NULL,
    `project_id` CHAR(26) NOT NULL,
    `role` ENUM('ADMIN', 'DEVELOPER', 'PRODUCT_OWNER') NOT NULL,

    PRIMARY KEY (`user_name`, `project_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `flag_definitions` ADD CONSTRAINT `flag_definitions_flag_id_fkey` FOREIGN KEY (`flag_id`) REFERENCES `flags`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_environments` ADD CONSTRAINT `project_environments_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_memberships` ADD CONSTRAINT `project_memberships_user_name_fkey` FOREIGN KEY (`user_name`) REFERENCES `users`(`user_name`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_memberships` ADD CONSTRAINT `project_memberships_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
