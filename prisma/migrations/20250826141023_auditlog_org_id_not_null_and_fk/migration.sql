/*
  Warnings:

  - Made the column `orgId` on table `AuditLog` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."AuditLog" ALTER COLUMN "orgId" SET NOT NULL;
