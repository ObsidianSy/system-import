-- Add freightCostUSD column to orders table
ALTER TABLE "orders" ADD COLUMN "freightCostUSD" integer DEFAULT 0 NOT NULL;
