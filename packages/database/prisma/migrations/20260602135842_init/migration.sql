-- CreateEnum
CREATE TYPE "NotificationBroadcastStatus" AS ENUM ('QUEUED', 'RUNNING', 'SENT', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "ModerationFlagStatus" AS ENUM ('PENDING', 'REVIEWED', 'DISMISSED', 'ACTIONED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'USER_ROLE_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'HACKATHON_STATUS_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'JOB_CANCELLED';
ALTER TYPE "AuditAction" ADD VALUE 'SEARCH_REINDEX_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE 'CERTIFICATE_DOWNLOADED';
ALTER TYPE "AuditAction" ADD VALUE 'CERTIFICATE_REVOKED';
ALTER TYPE "AuditAction" ADD VALUE 'CERTIFICATE_REGENERATE_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE 'DISCUSSION_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'DISCUSSION_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'DISCUSSION_COMMENT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'DISCUSSION_COMMENT_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'DISCUSSION_STATUS_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'DISCUSSION_PINNED';
ALTER TYPE "AuditAction" ADD VALUE 'DISCUSSION_UNPINNED';
ALTER TYPE "AuditAction" ADD VALUE 'DISCUSSION_FLAGGED';
ALTER TYPE "AuditAction" ADD VALUE 'FEEDBACK_VIEWED';
ALTER TYPE "AuditAction" ADD VALUE 'NOTIFICATION_PREFERENCES_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'BROADCAST_CANCELLED';
ALTER TYPE "AuditAction" ADD VALUE 'ORGANIZATION_LOGO_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'PROFILE_AVATAR_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'STORAGE_FILE_UPLOADED';
ALTER TYPE "AuditAction" ADD VALUE 'STORAGE_FILE_DELETED';

-- AlterEnum
ALTER TYPE "JobStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "analytics_jobs" ADD COLUMN     "cancellation_reason" TEXT,
ADD COLUMN     "cancelled_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "archive_jobs" ADD COLUMN     "cancellation_reason" TEXT,
ADD COLUMN     "cancelled_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "certificate_issuance_jobs" ADD COLUMN     "cancellation_reason" TEXT,
ADD COLUMN     "cancelled_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "discussion_comments" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" UUID;

-- AlterTable
ALTER TABLE "discussions" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" UUID;

-- AlterTable
ALTER TABLE "notification_broadcasts" ADD COLUMN     "cancellation_reason" TEXT,
ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "error" JSONB,
ADD COLUMN     "message" TEXT,
ADD COLUMN     "sent_at" TIMESTAMP(3),
ADD COLUMN     "status" "NotificationBroadcastStatus" NOT NULL DEFAULT 'QUEUED',
ADD COLUMN     "title" VARCHAR(255),
ADD COLUMN     "type" "NotificationType" NOT NULL DEFAULT 'ANNOUNCEMENT';

-- CreateTable
CREATE TABLE "discussion_flags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reporter_id" UUID NOT NULL,
    "discussion_id" UUID,
    "comment_id" UUID,
    "reason" VARCHAR(100) NOT NULL,
    "details" TEXT,
    "status" "ModerationFlagStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discussion_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stored_files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "storage_key" TEXT NOT NULL,
    "folder" VARCHAR(60) NOT NULL,
    "entity_id" UUID NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "owner_id" UUID,
    "mime_type" TEXT,
    "file_size" INTEGER,
    "checksum" TEXT,
    "access_level" VARCHAR(30) NOT NULL DEFAULT 'PUBLIC',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stored_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "discussion_flags_discussion_id_idx" ON "discussion_flags"("discussion_id");

-- CreateIndex
CREATE INDEX "discussion_flags_comment_id_idx" ON "discussion_flags"("comment_id");

-- CreateIndex
CREATE INDEX "discussion_flags_reporter_id_idx" ON "discussion_flags"("reporter_id");

-- CreateIndex
CREATE INDEX "discussion_flags_status_idx" ON "discussion_flags"("status");

-- CreateIndex
CREATE UNIQUE INDEX "stored_files_storage_key_key" ON "stored_files"("storage_key");

-- CreateIndex
CREATE INDEX "stored_files_folder_entity_id_idx" ON "stored_files"("folder", "entity_id");

-- CreateIndex
CREATE INDEX "stored_files_owner_id_idx" ON "stored_files"("owner_id");

-- CreateIndex
CREATE INDEX "stored_files_is_deleted_idx" ON "stored_files"("is_deleted");

-- CreateIndex
CREATE INDEX "notification_broadcasts_hackathon_id_status_idx" ON "notification_broadcasts"("hackathon_id", "status");
