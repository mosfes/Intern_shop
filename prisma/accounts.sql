-- Additive account tables. Existing shop data is preserved.
CREATE TABLE IF NOT EXISTS `ShopUser` (
    `googleId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(30) NOT NULL DEFAULT '',
    `picture` TEXT NULL,
    `disabled` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastLogin` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `ShopUser_email_key`(`email`),
    PRIMARY KEY (`googleId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `AdminCredential` (
    `email` VARCHAR(191) NOT NULL,
    `username` VARCHAR(64) NULL,
    `passwordHash` VARCHAR(255) NULL,
    `mustChangePassword` BOOLEAN NOT NULL DEFAULT false,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `version` INTEGER NOT NULL DEFAULT 1,
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `AdminCredential_username_key`(`username`),
    PRIMARY KEY (`email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `AdminLoginLimit` (
    `key` VARCHAR(64) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `expiresAt` DATETIME(3) NOT NULL,
    INDEX `AdminLoginLimit_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `CustomerCredential` (
  `email` VARCHAR(191) NOT NULL PRIMARY KEY,
  `passwordHash` VARCHAR(255) NOT NULL,
  `version` INTEGER NOT NULL DEFAULT 1
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `PendingRegistration` (
  `email` VARCHAR(191) NOT NULL PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(30) NOT NULL,
  `passwordHash` VARCHAR(255) NOT NULL,
  `codeHash` VARCHAR(64) NOT NULL,
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `expiresAt` DATETIME(3) NOT NULL
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
