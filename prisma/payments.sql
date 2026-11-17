-- Additive payment ledger table. Existing shop data is preserved.
CREATE TABLE IF NOT EXISTS `PaymentCharge` (
    `chargeId` VARCHAR(100) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `discountCode` VARCHAR(40) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`chargeId`),
    INDEX `PaymentCharge_userId_createdAt_idx` (`userId`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `CheckoutPayment` (
    `id` VARCHAR(100) NOT NULL,
    `chargeId` VARCHAR(100) NULL,
    `userId` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `order` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE INDEX `CheckoutPayment_chargeId_key` (`chargeId`),
    INDEX `CheckoutPayment_userId_status_createdAt_idx` (`userId`, `status`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
