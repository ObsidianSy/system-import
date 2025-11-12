ALTER TABLE "stockMovements" ADD COLUMN "previousAverageCostBRL" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "stockMovements" ADD COLUMN "newAverageCostBRL" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "stockMovements" ADD COLUMN "unitCostBRL" integer DEFAULT 0 NOT NULL;