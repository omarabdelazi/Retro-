ALTER TABLE "jobs" ADD COLUMN "product_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "qty" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "due_date" date;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "jobs_product_id_idx" ON "jobs" USING btree ("product_id");--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_qty_positive" CHECK ("jobs"."qty" > 0);