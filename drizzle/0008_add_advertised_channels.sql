-- Add advertisedChannels column to products table
ALTER TABLE "products" ADD COLUMN "advertisedChannels" text[] DEFAULT '{}' NOT NULL;
