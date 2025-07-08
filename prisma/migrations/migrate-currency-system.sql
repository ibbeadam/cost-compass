-- Migration to add Currency table and update Properties table
-- This handles the transition from string currency to relational currency

-- Step 1: Create the currencies table
CREATE TABLE IF NOT EXISTS `currencies` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(3) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `symbol` VARCHAR(10) NOT NULL,
  `display_name` VARCHAR(50) NOT NULL,
  `decimal_places` INTEGER NOT NULL DEFAULT 2,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `is_default` BOOLEAN NOT NULL DEFAULT false,
  `is_system_currency` BOOLEAN NOT NULL DEFAULT false,
  `exchange_rate` DECIMAL(10,6) NULL,
  `locale` VARCHAR(10) NULL,
  `created_by` INTEGER NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `currencies_code_key`(`code`),
  INDEX `currencies_code_idx`(`code`),
  INDEX `currencies_is_active_idx`(`is_active`),
  INDEX `currencies_is_default_idx`(`is_default`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 2: Insert default currencies (starting with commonly used ones)
INSERT INTO `currencies` (`code`, `name`, `symbol`, `display_name`, `decimal_places`, `is_active`, `is_default`, `is_system_currency`, `locale`) VALUES
('USD', 'US Dollar', '$', 'USD ($)', 2, 1, 1, 1, 'en-US'),
('EUR', 'Euro', '€', 'EUR (€)', 2, 1, 0, 1, 'en-US'),
('GBP', 'British Pound', '£', 'GBP (£)', 2, 1, 0, 1, 'en-GB'),
('JPY', 'Japanese Yen', '¥', 'JPY (¥)', 0, 1, 0, 1, 'ja-JP'),
('CAD', 'Canadian Dollar', 'C$', 'CAD (C$)', 2, 1, 0, 1, 'en-CA'),
('AUD', 'Australian Dollar', 'A$', 'AUD (A$)', 2, 1, 0, 1, 'en-AU');

-- Step 3: Add currency_id column to properties table
ALTER TABLE `properties` ADD COLUMN `currency_id` INTEGER NULL;

-- Step 4: Update existing properties to use currency_id based on their current currency string
UPDATE `properties` p 
JOIN `currencies` c ON p.`currency` = c.`code` 
SET p.`currency_id` = c.`id`;

-- Step 5: For any properties that don't have a matching currency, set them to USD (default)
UPDATE `properties` p 
SET p.`currency_id` = (SELECT id FROM `currencies` WHERE `code` = 'USD' LIMIT 1)
WHERE p.`currency_id` IS NULL;

-- Step 6: Add foreign key constraint and index
ALTER TABLE `properties` ADD INDEX `properties_currency_id_idx`(`currency_id`);
ALTER TABLE `properties` ADD CONSTRAINT `properties_currency_id_fkey` FOREIGN KEY (`currency_id`) REFERENCES `currencies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 7: Now we can safely drop the old currency column
ALTER TABLE `properties` DROP COLUMN `currency`;

-- Step 8: Add foreign key constraint for currency creator
ALTER TABLE `currencies` ADD CONSTRAINT `currencies_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;