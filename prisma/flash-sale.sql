CREATE TABLE IF NOT EXISTS `FlashSaleSetting` (
  `id` VARCHAR(40) NOT NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT true,
  `startsAt` DATETIME(3) NULL,
  `endsAt` DATETIME(3) NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
