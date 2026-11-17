-- Additive address book table. Existing shop data is preserved.
CREATE TABLE IF NOT EXISTS `CustomerAddress` (
    `id` VARCHAR(100) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(60) NOT NULL DEFAULT '',
    `fullName` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(30) NOT NULL,
    `address` VARCHAR(500) NOT NULL,
    `province` VARCHAR(100) NOT NULL,
    `district` VARCHAR(100) NOT NULL,
    `postcode` VARCHAR(10) NOT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`),
    INDEX `CustomerAddress_userId_createdAt_idx` (`userId`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
