CREATE TABLE `creditBatches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`amount` int NOT NULL,
	`remaining` int NOT NULL,
	`source` enum('plan_basic','plan_pro','individual_basic','individual_premium') NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`expiredEarly` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creditBatches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creditTransactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`batchId` int,
	`delta` int NOT NULL,
	`reason` enum('purchase','consume','expire','refund') NOT NULL,
	`appointmentId` int,
	`description` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `creditTransactions_id` PRIMARY KEY(`id`)
);
