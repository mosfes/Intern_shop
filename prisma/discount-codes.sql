-- Additive discount code table. Existing shop data is preserved.
CREATE TABLE IF NOT EXISTS `DiscountCode` (
    `code` VARCHAR(40) NOT NULL,
    `type` VARCHAR(10) NOT NULL,
    `value` INTEGER NOT NULL,
    `minSubtotal` INTEGER NOT NULL DEFAULT 0,
    `maxDiscount` INTEGER NULL,
    `usageLimit` INTEGER NULL,
    `usedCount` INTEGER NOT NULL DEFAULT 0,
    `expiresAt` DATETIME(3) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
