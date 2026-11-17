CREATE TABLE IF NOT EXISTS `Brand` (
    `id` VARCHAR(100) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `logoUrl` VARCHAR(2048) NULL,

    UNIQUE INDEX `Brand_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Category` (
    `id` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(180) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `nameTh` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `image` VARCHAR(2048) NOT NULL,

    UNIQUE INDEX `Category_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `CategorySpecField` (
    `id` VARCHAR(100) NOT NULL,
    `categoryId` VARCHAR(100) NOT NULL,
    `label` VARCHAR(120) NOT NULL,
    `example` VARCHAR(255) NOT NULL DEFAULT '',
    `compatibility` BOOLEAN NOT NULL DEFAULT false,
    `powerAdvice` BOOLEAN NOT NULL DEFAULT false,
    `position` INTEGER NOT NULL,

    INDEX `CategorySpecField_categoryId_position_idx`(`categoryId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Product` (
    `id` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(180) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `brandId` VARCHAR(100) NOT NULL,
    `categoryId` VARCHAR(100) NOT NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `originalPrice` DECIMAL(12, 2) NOT NULL,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `description` TEXT NOT NULL,
    `warranty` VARCHAR(255) NOT NULL,
    `rating` DOUBLE NOT NULL DEFAULT 0,
    `reviewCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Product_slug_key`(`slug`),
    INDEX `Product_brandId_idx`(`brandId`),
    INDEX `Product_categoryId_idx`(`categoryId`),
    INDEX `Product_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ProductImage` (
    `id` VARCHAR(100) NOT NULL,
    `productId` VARCHAR(100) NOT NULL,
    `url` VARCHAR(2048) NOT NULL,
    `position` INTEGER NOT NULL,

    INDEX `ProductImage_productId_position_idx`(`productId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ProductSpecification` (
    `id` VARCHAR(100) NOT NULL,
    `productId` VARCHAR(100) NOT NULL,
    `label` VARCHAR(120) NOT NULL,
    `value` VARCHAR(1000) NOT NULL,
    `position` INTEGER NOT NULL,
    `isHighlighted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `ProductSpecification_productId_position_idx`(`productId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ProductHighlight` (
    `id` VARCHAR(100) NOT NULL,
    `productId` VARCHAR(100) NOT NULL,
    `text` VARCHAR(1000) NOT NULL,
    `position` INTEGER NOT NULL,

    INDEX `ProductHighlight_productId_position_idx`(`productId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ProductShortSpec` (
    `id` VARCHAR(100) NOT NULL,
    `productId` VARCHAR(100) NOT NULL,
    `text` VARCHAR(1000) NOT NULL,
    `position` INTEGER NOT NULL,

    INDEX `ProductShortSpec_productId_position_idx`(`productId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ProductTag` (
    `productId` VARCHAR(100) NOT NULL,
    `tag` VARCHAR(30) NOT NULL,

    PRIMARY KEY (`productId`, `tag`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ProductReview` (
    `id` VARCHAR(100) NOT NULL,
    `productId` VARCHAR(100) NOT NULL,
    `author` VARCHAR(255) NOT NULL,
    `rating` DOUBLE NOT NULL,
    `date` VARCHAR(32) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `body` TEXT NOT NULL,
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `position` INTEGER NOT NULL,

    INDEX `ProductReview_productId_position_idx`(`productId`, `position`),
    PRIMARY KEY (`productId`, `id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Product` ADD CONSTRAINT `Product_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `Brand`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Product` ADD CONSTRAINT `Product_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `ProductImage` ADD CONSTRAINT `ProductImage_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ProductSpecification` ADD CONSTRAINT `ProductSpecification_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ProductHighlight` ADD CONSTRAINT `ProductHighlight_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ProductShortSpec` ADD CONSTRAINT `ProductShortSpec_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ProductTag` ADD CONSTRAINT `ProductTag_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ProductReview` ADD CONSTRAINT `ProductReview_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CategorySpecField` ADD CONSTRAINT `CategorySpecField_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
