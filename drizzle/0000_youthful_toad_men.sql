CREATE TABLE "importationItems" (
	"id" text PRIMARY KEY NOT NULL,
	"importationId" text NOT NULL,
	"productId" text,
	"productName" text NOT NULL,
	"productDescription" text,
	"supplierProductCode" text,
	"color" text,
	"size" text,
	"quantity" integer NOT NULL,
	"unitPriceUSD" integer NOT NULL,
	"totalUSD" integer NOT NULL,
	"unitCostBRL" integer NOT NULL,
	"totalCostBRL" integer NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "importations" (
	"id" text PRIMARY KEY NOT NULL,
	"invoiceNumber" text,
	"supplierId" text NOT NULL,
	"importDate" timestamp NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"exchangeRate" integer NOT NULL,
	"subtotalUSD" integer NOT NULL,
	"freightUSD" integer NOT NULL,
	"totalUSD" integer NOT NULL,
	"subtotalBRL" integer NOT NULL,
	"freightBRL" integer NOT NULL,
	"importTax" integer NOT NULL,
	"icms" integer NOT NULL,
	"otherTaxes" integer DEFAULT 0 NOT NULL,
	"totalCostBRL" integer NOT NULL,
	"shippingMethod" text,
	"trackingNumber" text,
	"estimatedDelivery" timestamp,
	"actualDelivery" timestamp,
	"transactionNumber" text,
	"paymentMethod" text,
	"notes" text,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sku" text,
	"supplierProductCode" text,
	"lastSupplierId" text,
	"ncmCode" text,
	"category" text,
	"imageUrl" text,
	"currentStock" integer DEFAULT 0 NOT NULL,
	"minStock" integer DEFAULT 0,
	"averageCostBRL" integer DEFAULT 0 NOT NULL,
	"salePriceBRL" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stockMovements" (
	"id" text PRIMARY KEY NOT NULL,
	"productId" text NOT NULL,
	"importationId" text,
	"movementType" text NOT NULL,
	"quantity" integer NOT NULL,
	"previousStock" integer NOT NULL,
	"newStock" integer NOT NULL,
	"reference" text,
	"notes" text,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"companyName" text,
	"address" text,
	"country" text,
	"phone" text,
	"email" text,
	"whatsapp" text,
	"contactPerson" text,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "taxConfig" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"importTaxRate" integer NOT NULL,
	"icmsRate" integer NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"loginMethod" text,
	"role" text DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"lastSignedIn" timestamp DEFAULT now()
);
