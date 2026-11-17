-- Additive cart table. Existing shop data is preserved.
CREATE TABLE IF NOT EXISTS `CartItem` (
    `userId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(100) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `selected` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`userId`, `productId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
