CREATE TABLE "DailyChatUsage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"dateKey" varchar(10) NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "DailyChatUsage" ADD CONSTRAINT "DailyChatUsage_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "DailyChatUsage_userId_dateKey_key" ON "DailyChatUsage" USING btree ("userId","dateKey");
