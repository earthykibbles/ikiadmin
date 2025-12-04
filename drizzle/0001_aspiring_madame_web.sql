CREATE TABLE "permission" (
	"id" text PRIMARY KEY NOT NULL,
	"resource" varchar(100) NOT NULL,
	"action" varchar(50) NOT NULL,
	"description" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resourcePermission" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"resourceType" varchar(100) NOT NULL,
	"resourceId" text,
	"permissions" jsonb DEFAULT '[]' NOT NULL,
	"conditions" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	"isSystem" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "role_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "rolePermission" (
	"roleId" text NOT NULL,
	"permissionId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rolePermission_roleId_permissionId_pk" PRIMARY KEY("roleId","permissionId")
);
--> statement-breakpoint
CREATE TABLE "userRole" (
	"userId" text NOT NULL,
	"roleId" text NOT NULL,
	"assignedBy" text,
	"assignedAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp,
	CONSTRAINT "userRole_userId_roleId_pk" PRIMARY KEY("userId","roleId")
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "twoFactorEnabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "resourcePermission" ADD CONSTRAINT "resourcePermission_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rolePermission" ADD CONSTRAINT "rolePermission_roleId_role_id_fk" FOREIGN KEY ("roleId") REFERENCES "public"."role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rolePermission" ADD CONSTRAINT "rolePermission_permissionId_permission_id_fk" FOREIGN KEY ("permissionId") REFERENCES "public"."permission"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "userRole" ADD CONSTRAINT "userRole_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "userRole" ADD CONSTRAINT "userRole_roleId_role_id_fk" FOREIGN KEY ("roleId") REFERENCES "public"."role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "userRole" ADD CONSTRAINT "userRole_assignedBy_user_id_fk" FOREIGN KEY ("assignedBy") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "permission_resource_action_idx" ON "permission" USING btree ("resource","action");--> statement-breakpoint
CREATE INDEX "resourcePermission_userId_idx" ON "resourcePermission" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "resourcePermission_resource_idx" ON "resourcePermission" USING btree ("resourceType","resourceId");--> statement-breakpoint
CREATE INDEX "role_name_idx" ON "role" USING btree ("name");--> statement-breakpoint
CREATE INDEX "rolePermission_roleId_idx" ON "rolePermission" USING btree ("roleId");--> statement-breakpoint
CREATE INDEX "rolePermission_permissionId_idx" ON "rolePermission" USING btree ("permissionId");--> statement-breakpoint
CREATE INDEX "userRole_userId_idx" ON "userRole" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "userRole_roleId_idx" ON "userRole" USING btree ("roleId");