ALTER TYPE "public"."order_status" ADD VALUE 'routed';--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;