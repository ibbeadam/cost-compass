/*
  Warnings:

  - You are about to drop the column `outletId` on the `daily_financial_summaries` table. All the data in the column will be lost.
  - You are about to alter the column `role` on the `users` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(0))`.
  - A unique constraint covering the columns `[date]` on the table `daily_financial_summaries` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `daily_financial_summaries` DROP FOREIGN KEY `daily_financial_summaries_outletId_fkey`;

-- DropIndex
DROP INDEX `daily_financial_summaries_date_outletId_key` ON `daily_financial_summaries`;

-- DropIndex
DROP INDEX `daily_financial_summaries_outletId_fkey` ON `daily_financial_summaries`;

-- AlterTable
ALTER TABLE `daily_financial_summaries` DROP COLUMN `outletId`,
    MODIFY `grossFoodCost` DOUBLE NULL DEFAULT 0,
    MODIFY `grossBeverageCost` DOUBLE NULL DEFAULT 0,
    MODIFY `netFoodCost` DOUBLE NULL DEFAULT 0,
    MODIFY `netBeverageCost` DOUBLE NULL DEFAULT 0,
    MODIFY `totalAdjustedFoodCost` DOUBLE NULL DEFAULT 0,
    MODIFY `totalAdjustedBeverageCost` DOUBLE NULL DEFAULT 0,
    MODIFY `totalCovers` DOUBLE NULL DEFAULT 0,
    MODIFY `averageCheck` DOUBLE NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `password` VARCHAR(191) NULL,
    MODIFY `role` ENUM('user', 'manager', 'admin') NOT NULL DEFAULT 'user';

-- CreateIndex
CREATE UNIQUE INDEX `daily_financial_summaries_date_key` ON `daily_financial_summaries`(`date`);
