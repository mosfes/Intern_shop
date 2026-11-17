CREATE TABLE IF NOT EXISTS `OrderEmail` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `recipient` VARCHAR(191) NOT NULL,
  `order` JSON NOT NULL,
  `event` VARCHAR(30) NOT NULL,
  `state` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `attempts` INT NOT NULL DEFAULT 0,
  `lockedAt` DATETIME(3) NULL,
  `sentAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `OrderEmail_state_createdAt_idx` (`state`, `createdAt`)
);
