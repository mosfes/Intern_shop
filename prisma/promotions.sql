CREATE TABLE IF NOT EXISTS `Promotion` (
    `id` VARCHAR(100) NOT NULL,
    `placement` ENUM('HERO', 'SIDE', 'BANNER') NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `tag` VARCHAR(60) NOT NULL DEFAULT '',
    `eyebrow` VARCHAR(120) NOT NULL DEFAULT '',
    `title` VARCHAR(160) NOT NULL,
    `highlight` VARCHAR(120) NOT NULL DEFAULT '',
    `description` VARCHAR(500) NOT NULL DEFAULT '',
    `image` VARCHAR(2048) NOT NULL,
    `ctaLabel` VARCHAR(60) NOT NULL DEFAULT '',
    `ctaHref` VARCHAR(500) NOT NULL,
    `secondaryLabel` VARCHAR(60) NOT NULL DEFAULT '',
    `secondaryHref` VARCHAR(500) NOT NULL DEFAULT '',
    `theme` VARCHAR(10) NOT NULL DEFAULT 'light',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Promotion_placement_position_idx`(`placement`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
