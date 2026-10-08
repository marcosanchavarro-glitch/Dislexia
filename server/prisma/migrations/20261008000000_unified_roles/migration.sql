BEGIN;
CREATE TYPE "Role" AS ENUM ('USER', 'EDITOR', 'ADMIN', 'SUPER_ADMIN');
ALTER TABLE "User" ADD COLUMN "name" TEXT, ADD COLUMN "role" "Role" NOT NULL DEFAULT 'USER';
ALTER TABLE "Admin" ADD COLUMN "migratedUserId" TEXT;
CREATE UNIQUE INDEX "Admin_migratedUserId_key" ON "Admin"("migratedUserId");
-- Existing community identities retain password, profile, status and activity.
DO $$
DECLARE legacy RECORD; linked_id TEXT; candidate TEXT; suffix INTEGER;
BEGIN
  FOR legacy IN SELECT * FROM "Admin" ORDER BY "createdAt", "id" LOOP
    IF (SELECT count(*) FROM "User" WHERE lower("email") = lower(legacy."email")) > 1 THEN
      RAISE EXCEPTION 'Multiple community identities match legacy Admin email; resolve the duplicate before migrating.';
    END IF;
    SELECT "id" INTO linked_id FROM "User" WHERE lower("email") = lower(legacy."email");
    IF linked_id IS NULL THEN
      linked_id := 'legacy_' || legacy."id";
      candidate := 'admin_' || substr(md5(legacy."id"), 1, 20);
      suffix := 0;
      WHILE EXISTS (SELECT 1 FROM "User" WHERE "username" = candidate) LOOP
        suffix := suffix + 1;
        candidate := 'admin_' || substr(md5(legacy."id"), 1, 16) || '_' || suffix;
      END LOOP;
      INSERT INTO "User" ("id", "name", "username", "email", "passwordHash", "role", "status", "createdAt", "updatedAt")
        VALUES (linked_id, legacy."name", candidate, lower(legacy."email"), legacy."passwordHash", 'SUPER_ADMIN', 'ACTIVE', legacy."createdAt", legacy."updatedAt");
    ELSE
      UPDATE "User" SET "role" = 'SUPER_ADMIN', "name" = coalesce("name", legacy."name") WHERE "id" = linked_id;
    END IF;
    UPDATE "Admin" SET "migratedUserId" = linked_id WHERE "id" = legacy."id";
  END LOOP;
END $$;
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_migratedUserId_fkey" FOREIGN KEY ("migratedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Content" ADD COLUMN "createdByUserId" TEXT;
ALTER TABLE "Content" ADD CONSTRAINT "Content_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "AdminAuditLog" (
  "id" TEXT NOT NULL PRIMARY KEY, "actorUserId" TEXT NOT NULL,
  "targetUserId" TEXT, "action" TEXT NOT NULL, "metadata" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AdminAuditLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "AdminAuditLog_targetUserId_createdAt_idx" ON "AdminAuditLog"("targetUserId", "createdAt");
CREATE INDEX "AdminAuditLog_actorUserId_createdAt_idx" ON "AdminAuditLog"("actorUserId", "createdAt");
COMMIT;
