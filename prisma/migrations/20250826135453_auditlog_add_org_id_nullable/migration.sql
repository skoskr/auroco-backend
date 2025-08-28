-- DropIndex
DROP INDEX "public"."AuditLog_createdAt_idx";

-- AlterTable
ALTER TABLE "public"."AuditLog" ADD COLUMN     "orgId" TEXT,
ALTER COLUMN "resource" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Membership" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "AuditLog_orgId_createdAt_idx" ON "public"."AuditLog"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "public"."Membership"("userId");

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
