CREATE TABLE `assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`nameEn` varchar(128),
	`purchasePrice` decimal(14,2) NOT NULL,
	`lifespanYears` int NOT NULL,
	`purchaseDate` date NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fixed_expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`nameEn` varchar(128),
	`amount` decimal(12,2) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fixed_expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `flexible_budgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`nameEn` varchar(128),
	`budgetAmount` decimal(12,2) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `flexible_budgets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `income_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`nameEn` varchar(128),
	`amount` decimal(12,2) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `income_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monthly_settlements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`totalIncome` decimal(12,2) NOT NULL,
	`totalFixed` decimal(12,2) NOT NULL,
	`totalFlexibleBudget` decimal(12,2) NOT NULL,
	`totalFlexibleActual` decimal(12,2) NOT NULL,
	`totalRepayment` decimal(12,2) NOT NULL,
	`totalSurplus` decimal(12,2) NOT NULL,
	`investmentAmount` decimal(12,2) NOT NULL,
	`savingsAdded` decimal(12,2) NOT NULL,
	`settledAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `monthly_settlements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `repayment_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`nameEn` varchar(128),
	`amount` decimal(12,2) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `repayment_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `savings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`totalAmount` decimal(14,2) NOT NULL DEFAULT '0',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `savings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`categoryType` enum('fixed','flexible','repayment','other') NOT NULL,
	`categoryId` int,
	`categoryName` varchar(128),
	`note` text,
	`transactionDate` date NOT NULL,
	`isCompanyAdvance` boolean NOT NULL DEFAULT false,
	`advanceStartDate` timestamp,
	`isInvoiced` boolean NOT NULL DEFAULT false,
	`invoicedAt` timestamp,
	`settlementId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
