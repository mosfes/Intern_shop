CREATE TABLE IF NOT EXISTS `AdminActivityLog` (
  `id` VARCHAR(100) NOT NULL,
  `actorEmail` VARCHAR(191) NOT NULL,
  `actorName` VARCHAR(255) NOT NULL,
  `resource` VARCHAR(40) NOT NULL,
  `action` VARCHAR(64) NOT NULL,
  `target` VARCHAR(255) NOT NULL,
  `status` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `AdminActivityLog_createdAt_id_idx` (`createdAt`, `id`),
  INDEX `AdminActivityLog_resource_createdAt_idx` (`resource`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
