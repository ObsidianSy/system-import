-- Allow null supplierId in orders table
ALTER TABLE "orders" ALTER COLUMN "supplierId" DROP NOT NULL;
