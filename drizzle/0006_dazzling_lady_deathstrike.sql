ALTER TABLE "stockMovements" ADD COLUMN "previousAverageCostUSD" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "stockMovements" ADD COLUMN "newAverageCostUSD" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "stockMovements" ADD COLUMN "unitCostUSD" integer DEFAULT 0 NOT NULL;