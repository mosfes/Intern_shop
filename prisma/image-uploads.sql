CREATE TABLE IF NOT EXISTS `ImageUpload` (
    `key` VARCHAR(255) NOT NULL,
    `url` VARCHAR(2048) NOT NULL,
    `ownerId` VARCHAR(191) NULL,
    `draftId` VARCHAR(36) NULL,
    `state` ENUM('PENDING', 'ATTACHED', 'DELETING', 'DELETED') NOT NULL DEFAULT 'PENDING',
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `lastError` VARCHAR(255) NULL,

    INDEX `ImageUpload_state_expiresAt_idx`(`state`, `expiresAt`),
    INDEX `ImageUpload_ownerId_draftId_state_idx`(`ownerId`, `draftId`, `state`),
    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
