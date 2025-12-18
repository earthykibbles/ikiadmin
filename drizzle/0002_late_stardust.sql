CREATE TABLE "auditLog" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text,
	"action" varchar(100) NOT NULL,
	"severity" varchar(20) DEFAULT 'info' NOT NULL,
	"message" text,
	"ipAddress" text,
	"userAgent" text,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "securitySettings" (
	"id" text PRIMARY KEY NOT NULL,
	"enforceTwoFactorForAll" boolean DEFAULT false NOT NULL,
	"loginAlertEnabled" boolean DEFAULT false NOT NULL,
	"loginAlertEmails" jsonb DEFAULT '[]' NOT NULL,
	"ipAllowlistEnabled" boolean DEFAULT false NOT NULL,
	"ipAllowlist" jsonb DEFAULT '[]' NOT NULL,
	"passwordMinLength" integer DEFAULT 12 NOT NULL,
	"passwordRequireUppercase" boolean DEFAULT true NOT NULL,
	"passwordRequireNumber" boolean DEFAULT true NOT NULL,
	"passwordRequireSpecial" boolean DEFAULT true NOT NULL,
	"passwordExpirationDays" integer DEFAULT 0 NOT NULL,
	"forcePasswordChangeOnFirstLogin" boolean DEFAULT false NOT NULL,
	"maxActiveSessionsPerUser" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "mustChangePassword" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "passwordChangedAt" timestamp;--> statement-breakpoint
ALTER TABLE "auditLog" ADD CONSTRAINT "auditLog_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auditLog_userId_idx" ON "auditLog" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "auditLog_severity_idx" ON "auditLog" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "auditLog_createdAt_idx" ON "auditLog" USING btree ("createdAt");