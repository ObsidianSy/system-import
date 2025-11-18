CREATE TABLE "orderItems" (
	"id" text PRIMARY KEY NOT NULL,
	"orderId" text NOT NULL,
	"productId" text,
	"productName" text NOT NULL,
	"sku" text,
	"imageUrl" text,
	"quantity" integer NOT NULL,
	"unitPriceUSD" integer NOT NULL,
	"subtotalUSD" integer NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"supplierId" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
