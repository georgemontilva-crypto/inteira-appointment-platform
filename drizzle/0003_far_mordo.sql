ALTER TABLE `reviews` DROP INDEX `reviews_appointmentId_unique`;--> statement-breakpoint
ALTER TABLE `reviews` MODIFY COLUMN `appointmentId` int;--> statement-breakpoint
ALTER TABLE `reviews` ADD `isVerified` boolean DEFAULT false;