CREATE TABLE `users` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `password` VARCHAR(191) NOT NULL,
  `role` ENUM('SUPER_ADMIN','USER','ORGANIZATION_ADMIN','ORGANIZATION_EDITOR') NOT NULL DEFAULT 'USER',
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `users_email_key`(`email`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `sessions` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `refresh_token_hash` VARCHAR(191) NOT NULL,
  `expires_at` DATETIME(3) NOT NULL,
  `revoked_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `sessions_user_id_idx`(`user_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `organizations` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `logo` VARCHAR(191) NULL,
  `description` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `organizations_slug_key`(`slug`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `organization_memberships` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `organization_id` VARCHAR(191) NOT NULL,
  `role` ENUM('SUPER_ADMIN','USER','ORGANIZATION_ADMIN','ORGANIZATION_EDITOR') NOT NULL DEFAULT 'ORGANIZATION_ADMIN',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `organization_memberships_user_id_organization_id_key`(`user_id`,`organization_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `organization_memberships_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `organization_memberships_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `organization_members` (
  `id` VARCHAR(191) NOT NULL,
  `organization_id` VARCHAR(191) NOT NULL,
  `member_number` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NULL,
  `phone` VARCHAR(191) NULL,
  `nik` VARCHAR(512) NULL,
  `address` TEXT NULL,
  `photo` VARCHAR(191) NULL,
  `department` VARCHAR(191) NULL,
  `position` VARCHAR(191) NULL,
  `status` ENUM('ACTIVE','INACTIVE','EXPIRED') NOT NULL DEFAULT 'ACTIVE',
  `joined_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `organization_members_organization_id_member_number_key`(`organization_id`,`member_number`),
  INDEX `organization_members_organization_id_name_idx`(`organization_id`,`name`),
  PRIMARY KEY (`id`),
  CONSTRAINT `organization_members_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `member_qr_tokens` (
  `id` VARCHAR(191) NOT NULL,
  `member_id` VARCHAR(191) NOT NULL,
  `token_hash` VARCHAR(191) NOT NULL,
  `expires_at` DATETIME(3) NULL,
  `revoked_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `member_qr_tokens_token_hash_key`(`token_hash`),
  PRIMARY KEY (`id`),
  CONSTRAINT `member_qr_tokens_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `organization_members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `templates` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `type` ENUM('EVENT_TICKET','PARKING_TICKET','ENTRY_TICKET','INVITATION','MEMBERSHIP_CARD','ID_CARD','CUSTOM') NOT NULL,
  `thumbnail` VARCHAR(191) NULL,
  `is_public` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `designs` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `template_id` VARCHAR(191) NULL,
  `name` VARCHAR(191) NOT NULL,
  `type` ENUM('EVENT_TICKET','PARKING_TICKET','ENTRY_TICKET','INVITATION','MEMBERSHIP_CARD','ID_CARD','CUSTOM') NOT NULL,
  `width` INTEGER NOT NULL,
  `height` INTEGER NOT NULL,
  `unit` VARCHAR(191) NOT NULL DEFAULT 'px',
  `config` JSON NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `designs_user_id_idx`(`user_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `designs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `designs_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `design_sides` (
  `id` VARCHAR(191) NOT NULL,
  `design_id` VARCHAR(191) NOT NULL,
  `side` VARCHAR(191) NOT NULL,
  `config` JSON NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `design_sides_design_id_side_key`(`design_id`,`side`),
  PRIMARY KEY (`id`),
  CONSTRAINT `design_sides_design_id_fkey` FOREIGN KEY (`design_id`) REFERENCES `designs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `design_assets` (
  `id` VARCHAR(191) NOT NULL,
  `owner_id` VARCHAR(191) NOT NULL,
  `file_name` VARCHAR(191) NOT NULL,
  `file_url` VARCHAR(191) NOT NULL,
  `mime_type` VARCHAR(191) NOT NULL,
  `file_size` BIGINT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `design_assets_owner_id_idx`(`owner_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `membership_card_batches` (
  `id` VARCHAR(191) NOT NULL,
  `organization_id` VARCHAR(191) NOT NULL,
  `design_id` VARCHAR(191) NOT NULL,
  `status` ENUM('PENDING','PROCESSING','COMPLETED','FAILED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `total_items` INTEGER NOT NULL DEFAULT 0,
  `processed_items` INTEGER NOT NULL DEFAULT 0,
  `failed_items` INTEGER NOT NULL DEFAULT 0,
  `output_url` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `completed_at` DATETIME(3) NULL,
  INDEX `membership_card_batches_organization_id_status_idx`(`organization_id`,`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `membership_card_batch_items` (
  `id` VARCHAR(191) NOT NULL,
  `batch_id` VARCHAR(191) NOT NULL,
  `member_id` VARCHAR(191) NOT NULL,
  `status` ENUM('PENDING','PROCESSING','COMPLETED','FAILED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `output_url` VARCHAR(191) NULL,
  `error` TEXT NULL,
  UNIQUE INDEX `membership_card_batch_items_batch_id_member_id_key`(`batch_id`,`member_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `membership_card_batch_items_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `membership_card_batches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `tickets` (
  `id` VARCHAR(191) NOT NULL,
  `batch_id` VARCHAR(191) NULL,
  `ticket_code` VARCHAR(191) NOT NULL,
  `holder_name` VARCHAR(191) NULL,
  `qr_token_hash` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `tickets_ticket_code_key`(`ticket_code`),
  UNIQUE INDEX `tickets_qr_token_hash_key`(`qr_token_hash`),
  INDEX `tickets_batch_id_idx`(`batch_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ai_design_histories` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `design_id` VARCHAR(191) NULL,
  `prompt` TEXT NOT NULL,
  `model` VARCHAR(191) NOT NULL,
  `input_config` JSON NULL,
  `output_config` JSON NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'COMPLETED',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `ai_design_histories_user_id_idx`(`user_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `export_histories` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `design_id` VARCHAR(191) NULL,
  `format` VARCHAR(191) NOT NULL,
  `file_url` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `export_histories_user_id_idx`(`user_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

