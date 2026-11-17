-- Coordination and durable deltas only. MockAPI remains the source of its stock totals.
CREATE TABLE IF NOT EXISTS `StockLock` (
  `productId` VARCHAR(100) NOT NULL,
  `nextSequence` BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`productId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `StockReservation` (
  `checkoutId` VARCHAR(100) NOT NULL,
  `productId` VARCHAR(100) NOT NULL,
  `quantity` INTEGER NOT NULL,
  `state` VARCHAR(20) NOT NULL DEFAULT 'held',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`checkoutId`, `productId`),
  INDEX `StockReservation_productId_state_idx` (`productId`, `state`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `StockMovement` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `operationId` VARCHAR(36) NOT NULL,
  `checkoutId` VARCHAR(100) NOT NULL,
  `productId` VARCHAR(100) NOT NULL,
  `direction` VARCHAR(10) NOT NULL,
  `sequence` BIGINT NOT NULL,
  `quantity` INTEGER NOT NULL,
  `state` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `lastError` VARCHAR(255) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `StockMovement_operationId_key` (`operationId`),
  UNIQUE INDEX `StockMovement_checkoutId_productId_direction_key` (`checkoutId`, `productId`, `direction`),
  UNIQUE INDEX `StockMovement_productId_sequence_key` (`productId`, `sequence`),
  INDEX `StockMovement_productId_state_sequence_idx` (`productId`, `state`, `sequence`),
  INDEX `StockMovement_state_id_idx` (`state`, `id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
