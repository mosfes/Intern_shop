CREATE TABLE IF NOT EXISTS `FlashSaleItem` (
  `productId` VARCHAR(100) NOT NULL,
  `price` DECIMAL(12, 2) NOT NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`productId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
