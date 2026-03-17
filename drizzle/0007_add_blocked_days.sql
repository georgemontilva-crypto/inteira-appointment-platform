CREATE TABLE IF NOT EXISTS `blockedDays` (
  `id` int AUTO_INCREMENT NOT NULL,
  `professionalId` int NOT NULL,
  `blockedDate` varchar(10) NOT NULL,
  `reason` varchar(255),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `blockedDays_id` PRIMARY KEY(`id`)
);
