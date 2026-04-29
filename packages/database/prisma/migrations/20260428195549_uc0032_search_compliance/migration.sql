-- CreateEnum
CREATE TYPE "DiscussionStatus" AS ENUM ('PUBLISHED', 'UNDER_REVIEW');

-- CreateEnum
CREATE TYPE "MentorRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JudgingPhase" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETE');

-- CreateEnum
CREATE TYPE "ScoreboardType" AS ENUM ('HIDDEN', 'REALTIME', 'FINAL_ONLY');

-- CreateEnum
CREATE TYPE "FeedbackVisibility" AS ENUM ('HIDDEN', 'RELEASED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "DeliveryChannel" AS ENUM ('EMAIL', 'SMS', 'PUSH', 'IN_APP');

-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('PENDING', 'GENERATED', 'FAILED');

-- CreateEnum
CREATE TYPE "IssuanceJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AnalyticsJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SnapshotType" AS ENUM ('DAILY', 'ON_DEMAND');

-- CreateEnum
CREATE TYPE "ArchiveStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "ArchiveJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SearchSource" AS ENUM ('CURRENT', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('CSV', 'PDF', 'JSON', 'XLSX');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CertificateType" AS ENUM ('CERTIFICATE', 'BADGE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'VIEW_SCOREBOARD';
ALTER TYPE "AuditAction" ADD VALUE 'MISSING_TRANSLATION';
ALTER TYPE "AuditAction" ADD VALUE 'CREATE_ADMIN';
ALTER TYPE "AuditAction" ADD VALUE 'SUSPEND_ACCOUNT';
ALTER TYPE "AuditAction" ADD VALUE 'REVOKE_SESSION';
ALTER TYPE "AuditAction" ADD VALUE 'EXPORT_LOGS';
ALTER TYPE "AuditAction" ADD VALUE 'PROVISION_ADMIN_INVITE';

-- DropIndex
DROP INDEX "certificates_user_id_idx";

-- AlterTable
ALTER TABLE "certificates" ADD COLUMN     "checksum" TEXT,
ADD COLUMN     "download_token" TEXT,
ADD COLUMN     "file_size" INTEGER,
ADD COLUMN     "generationError" JSONB,
ADD COLUMN     "issuance_job_id" UUID,
ADD COLUMN     "issued_by" UUID,
ADD COLUMN     "mime_type" TEXT,
ADD COLUMN     "status" "CertificateStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "storage_path" TEXT,
ADD COLUMN     "token_expires_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "discussion_comments" ADD COLUMN     "archived_at" TIMESTAMP(3),
ADD COLUMN     "archived_by" UUID,
ADD COLUMN     "is_archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" "DiscussionStatus" NOT NULL DEFAULT 'PUBLISHED';

-- AlterTable
ALTER TABLE "discussions" ADD COLUMN     "archived_at" TIMESTAMP(3),
ADD COLUMN     "archived_by" UUID,
ADD COLUMN     "is_archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" "DiscussionStatus" NOT NULL DEFAULT 'PUBLISHED';

-- AlterTable
ALTER TABLE "hackathons" ADD COLUMN     "enforce_feedback_lock" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "feedback_deadline" TIMESTAMP(3),
ADD COLUMN     "feedback_release_at" TIMESTAMP(3),
ADD COLUMN     "feedback_visibility" "FeedbackVisibility" NOT NULL DEFAULT 'HIDDEN',
ADD COLUMN     "is_calculating" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_feedback_released" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_scoreboard_published" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "judging_phase" "JudgingPhase" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN     "results_published_at" TIMESTAMP(3),
ADD COLUMN     "scoreboard_release_at" TIMESTAMP(3),
ADD COLUMN     "scoreboard_type" "ScoreboardType" NOT NULL DEFAULT 'FINAL_ONLY',
ADD COLUMN     "scoring_rules" JSONB;

-- AlterTable
ALTER TABLE "localized_strings" ADD COLUMN     "is_missing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_accessed" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "broadcast_id" UUID;

-- AlterTable
ALTER TABLE "scores" ADD COLUMN     "is_comment_public" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "revoked_at" TIMESTAMP(3),
ADD COLUMN     "revoked_by" UUID;

-- AlterTable
ALTER TABLE "submissions" ADD COLUMN     "is_feedback_visible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "structured_feedback" JSONB,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "is_seeking_team" BOOLEAN DEFAULT true,
ADD COLUMN     "mentor_max_daily_interactions" INTEGER;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "suspended_at" TIMESTAMP(3),
ADD COLUMN     "suspension_reason" TEXT;

-- CreateTable
CREATE TABLE "submission_histories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "submission_id" UUID NOT NULL,
    "previous_title" VARCHAR(255),
    "previous_description" TEXT,
    "previous_file_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" UUID,

    CONSTRAINT "submission_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scoreboard_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hackathon_id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "final_score" DOUBLE PRECISION,
    "rank" INTEGER,
    "aggregated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scoreboard_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_issuance_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hackathon_id" UUID,
    "created_by" UUID,
    "status" "IssuanceJobStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificate_issuance_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_notification_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "email" BOOLEAN NOT NULL DEFAULT true,
    "push" BOOLEAN NOT NULL DEFAULT true,
    "sms" BOOLEAN NOT NULL DEFAULT true,
    "in_app" BOOLEAN NOT NULL DEFAULT true,
    "types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "notification_id" UUID NOT NULL,
    "channel" "DeliveryChannel" NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" JSONB,
    "sentAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "channel" "DeliveryChannel" NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_broadcasts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hackathon_id" UUID,
    "template_id" UUID,
    "trigger_rule" TEXT,
    "created_by" UUID,
    "scheduled_at" TIMESTAMP(3),
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_broadcasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_analytics_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hackathon_id" UUID NOT NULL,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "snapshot_type" "SnapshotType",
    "metrics" JSONB NOT NULL,
    "registration_count" INTEGER,
    "submission_count" INTEGER,
    "team_count" INTEGER,
    "avg_team_size" DOUBLE PRECISION,
    "judge_count" INTEGER,
    "avg_judge_score" DOUBLE PRECISION,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "computed_duration_ms" INTEGER,
    "expires_at" TIMESTAMP(3),
    "computed_by" UUID,
    "source_job_id" UUID,

    CONSTRAINT "event_analytics_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hackathon_id" UUID,
    "created_by" UUID,
    "status" "AnalyticsJobStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB,
    "scheduledAt" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "timeoutAt" TIMESTAMP(3),
    "locked_by" UUID,
    "locked_at" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "error" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID NOT NULL,
    "storage_path" TEXT NOT NULL,
    "mime_type" TEXT,
    "file_size" INTEGER,
    "checksum" TEXT,
    "download_token" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hackathon_id" UUID,
    "created_by" UUID,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "format" "ReportFormat" NOT NULL,
    "parameters" JSONB,
    "scheduledAt" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "timeoutAt" TIMESTAMP(3),
    "locked_by" UUID,
    "locked_at" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "error" JSONB,
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_invitations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ORGANIZER',
    "token" TEXT NOT NULL,
    "invited_by" UUID,
    "expires_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "accepted_by" UUID,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archive_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hackathon_id" UUID,
    "created_by" UUID,
    "status" "ArchiveJobStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB,
    "scheduledAt" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "timeoutAt" TIMESTAMP(3),
    "locked_by" UUID,
    "locked_at" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "error" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archive_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archive_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID NOT NULL,
    "entity" VARCHAR(100) NOT NULL,
    "entity_id" UUID NOT NULL,
    "storage_path" TEXT,
    "mime_type" TEXT,
    "file_size" INTEGER,
    "checksum" TEXT,
    "metadata" JSONB,
    "download_token" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "status" "ArchiveStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" JSONB,
    "archivedAt" TIMESTAMP(3),
    "archived_by" UUID,
    "expiresAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archive_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entity" VARCHAR(100) NOT NULL,
    "entity_id" UUID NOT NULL,
    "source" "SearchSource" NOT NULL DEFAULT 'CURRENT',
    "title" VARCHAR(500),
    "url" TEXT,
    "searchText" TEXT NOT NULL,
    "metadata" JSONB,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "indexed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "query" TEXT NOT NULL,
    "actor_id" UUID,
    "result_count" INTEGER NOT NULL DEFAULT 0,
    "source" "SearchSource",
    "duration_ms" INTEGER,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentor_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requester_id" UUID NOT NULL,
    "mentor_id" UUID NOT NULL,
    "team_id" UUID,
    "message" TEXT,
    "preferred_at" TIMESTAMP(3),
    "status" "MentorRequestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mentor_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_feedbacks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "hackathon_id" UUID NOT NULL,
    "org_rating" INTEGER NOT NULL,
    "rules_rating" INTEGER NOT NULL,
    "judging_rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "submission_histories_submission_id_idx" ON "submission_histories"("submission_id");

-- CreateIndex
CREATE INDEX "scoreboard_entries_hackathon_id_idx" ON "scoreboard_entries"("hackathon_id");

-- CreateIndex
CREATE UNIQUE INDEX "scoreboard_entries_hackathon_id_submission_id_key" ON "scoreboard_entries"("hackathon_id", "submission_id");

-- CreateIndex
CREATE INDEX "certificate_issuance_jobs_hackathon_id_idx" ON "certificate_issuance_jobs"("hackathon_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_notification_preferences_user_id_key" ON "user_notification_preferences"("user_id");

-- CreateIndex
CREATE INDEX "notification_deliveries_notification_id_idx" ON "notification_deliveries"("notification_id");

-- CreateIndex
CREATE INDEX "notification_deliveries_status_idx" ON "notification_deliveries"("status");

-- CreateIndex
CREATE INDEX "notification_deliveries_status_nextAttemptAt_idx" ON "notification_deliveries"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "notification_broadcasts_trigger_rule_idx" ON "notification_broadcasts"("trigger_rule");

-- CreateIndex
CREATE INDEX "event_analytics_snapshots_hackathon_id_computed_at_idx" ON "event_analytics_snapshots"("hackathon_id", "computed_at");

-- CreateIndex
CREATE INDEX "event_analytics_snapshots_expires_at_idx" ON "event_analytics_snapshots"("expires_at");

-- CreateIndex
CREATE INDEX "analytics_jobs_hackathon_id_status_idx" ON "analytics_jobs"("hackathon_id", "status");

-- CreateIndex
CREATE INDEX "analytics_jobs_scheduledAt_status_idx" ON "analytics_jobs"("scheduledAt", "status");

-- CreateIndex
CREATE INDEX "analytics_jobs_locked_by_locked_at_idx" ON "analytics_jobs"("locked_by", "locked_at");

-- CreateIndex
CREATE UNIQUE INDEX "report_files_job_id_key" ON "report_files"("job_id");

-- CreateIndex
CREATE INDEX "report_files_download_token_idx" ON "report_files"("download_token");

-- CreateIndex
CREATE INDEX "report_files_expires_at_idx" ON "report_files"("expires_at");

-- CreateIndex
CREATE INDEX "report_jobs_hackathon_id_status_idx" ON "report_jobs"("hackathon_id", "status");

-- CreateIndex
CREATE INDEX "report_jobs_scheduledAt_status_idx" ON "report_jobs"("scheduledAt", "status");

-- CreateIndex
CREATE INDEX "report_jobs_locked_by_locked_at_idx" ON "report_jobs"("locked_by", "locked_at");

-- CreateIndex
CREATE UNIQUE INDEX "admin_invitations_token_key" ON "admin_invitations"("token");

-- CreateIndex
CREATE INDEX "admin_invitations_email_idx" ON "admin_invitations"("email");

-- CreateIndex
CREATE INDEX "admin_invitations_invited_by_idx" ON "admin_invitations"("invited_by");

-- CreateIndex
CREATE INDEX "admin_invitations_expires_at_idx" ON "admin_invitations"("expires_at");

-- CreateIndex
CREATE INDEX "archive_jobs_hackathon_id_status_idx" ON "archive_jobs"("hackathon_id", "status");

-- CreateIndex
CREATE INDEX "archive_jobs_scheduledAt_status_idx" ON "archive_jobs"("scheduledAt", "status");

-- CreateIndex
CREATE INDEX "archive_jobs_locked_by_locked_at_idx" ON "archive_jobs"("locked_by", "locked_at");

-- CreateIndex
CREATE INDEX "archive_records_job_id_idx" ON "archive_records"("job_id");

-- CreateIndex
CREATE INDEX "archive_records_entity_entity_id_idx" ON "archive_records"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "archive_records_download_token_idx" ON "archive_records"("download_token");

-- CreateIndex
CREATE INDEX "archive_records_expiresAt_idx" ON "archive_records"("expiresAt");

-- CreateIndex
CREATE INDEX "search_documents_entity_entity_id_idx" ON "search_documents"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "search_documents_source_indexed_at_idx" ON "search_documents"("source", "indexed_at");

-- CreateIndex
CREATE INDEX "search_documents_source_is_archived_idx" ON "search_documents"("source", "is_archived");

-- CreateIndex
CREATE INDEX "search_logs_actor_id_idx" ON "search_logs"("actor_id");

-- CreateIndex
CREATE INDEX "search_logs_created_at_idx" ON "search_logs"("created_at");

-- CreateIndex
CREATE INDEX "search_logs_result_count_idx" ON "search_logs"("result_count");

-- CreateIndex
CREATE INDEX "mentor_requests_mentor_id_idx" ON "mentor_requests"("mentor_id");

-- CreateIndex
CREATE INDEX "mentor_requests_requester_id_idx" ON "mentor_requests"("requester_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_feedbacks_user_id_hackathon_id_key" ON "event_feedbacks"("user_id", "hackathon_id");

-- CreateIndex
CREATE INDEX "certificates_user_id_issued_at_idx" ON "certificates"("user_id", "issued_at");

-- CreateIndex
CREATE INDEX "certificates_download_token_idx" ON "certificates"("download_token");

-- CreateIndex
CREATE INDEX "certificates_status_idx" ON "certificates"("status");

-- CreateIndex
CREATE INDEX "notifications_broadcast_id_idx" ON "notifications"("broadcast_id");

-- CreateIndex
CREATE INDEX "registrations_hackathon_id_created_at_idx" ON "registrations"("hackathon_id", "created_at");

-- CreateIndex
CREATE INDEX "scores_criteria_id_judge_id_created_at_idx" ON "scores"("criteria_id", "judge_id", "created_at");

-- CreateIndex
CREATE INDEX "scores_judge_id_created_at_idx" ON "scores"("judge_id", "created_at");

-- CreateIndex
CREATE INDEX "submissions_hackathon_id_submitted_at_idx" ON "submissions"("hackathon_id", "submitted_at");

-- AddForeignKey
ALTER TABLE "hackathons" ADD CONSTRAINT "hackathons_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_histories" ADD CONSTRAINT "submission_histories_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scoreboard_entries" ADD CONSTRAINT "scoreboard_entries_hackathon_id_fkey" FOREIGN KEY ("hackathon_id") REFERENCES "hackathons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scoreboard_entries" ADD CONSTRAINT "scoreboard_entries_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_broadcast_id_fkey" FOREIGN KEY ("broadcast_id") REFERENCES "notification_broadcasts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_issuance_job_id_fkey" FOREIGN KEY ("issuance_job_id") REFERENCES "certificate_issuance_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_issuance_jobs" ADD CONSTRAINT "certificate_issuance_jobs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_issuance_jobs" ADD CONSTRAINT "certificate_issuance_jobs_hackathon_id_fkey" FOREIGN KEY ("hackathon_id") REFERENCES "hackathons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_broadcasts" ADD CONSTRAINT "notification_broadcasts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_broadcasts" ADD CONSTRAINT "notification_broadcasts_hackathon_id_fkey" FOREIGN KEY ("hackathon_id") REFERENCES "hackathons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_broadcasts" ADD CONSTRAINT "notification_broadcasts_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "notification_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_analytics_snapshots" ADD CONSTRAINT "event_analytics_snapshots_computed_by_fkey" FOREIGN KEY ("computed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_analytics_snapshots" ADD CONSTRAINT "event_analytics_snapshots_source_job_id_fkey" FOREIGN KEY ("source_job_id") REFERENCES "analytics_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_analytics_snapshots" ADD CONSTRAINT "event_analytics_snapshots_hackathon_id_fkey" FOREIGN KEY ("hackathon_id") REFERENCES "hackathons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_jobs" ADD CONSTRAINT "analytics_jobs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_jobs" ADD CONSTRAINT "analytics_jobs_hackathon_id_fkey" FOREIGN KEY ("hackathon_id") REFERENCES "hackathons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_files" ADD CONSTRAINT "report_files_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "report_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_jobs" ADD CONSTRAINT "report_jobs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_jobs" ADD CONSTRAINT "report_jobs_hackathon_id_fkey" FOREIGN KEY ("hackathon_id") REFERENCES "hackathons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_invitations" ADD CONSTRAINT "admin_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_invitations" ADD CONSTRAINT "admin_invitations_accepted_by_fkey" FOREIGN KEY ("accepted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archive_jobs" ADD CONSTRAINT "archive_jobs_hackathon_id_fkey" FOREIGN KEY ("hackathon_id") REFERENCES "hackathons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archive_records" ADD CONSTRAINT "archive_records_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "archive_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_requests" ADD CONSTRAINT "mentor_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_requests" ADD CONSTRAINT "mentor_requests_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_requests" ADD CONSTRAINT "mentor_requests_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_revoked_by_fkey" FOREIGN KEY ("revoked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_feedbacks" ADD CONSTRAINT "event_feedbacks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_feedbacks" ADD CONSTRAINT "event_feedbacks_hackathon_id_fkey" FOREIGN KEY ("hackathon_id") REFERENCES "hackathons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ==========================================================================
-- UC0032: PostgreSQL full-text search support on search_documents
-- Prisma cannot express GIN indexes, so these are added as raw SQL.
-- ==========================================================================

-- 1. Add a generated tsvector column for full-text search
ALTER TABLE "search_documents"
  ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce("title", '') || ' ' || "searchText")) STORED;

-- 2. GIN index on the tsvector column (powers ts_query lookups)
CREATE INDEX "search_documents_search_vector_idx"
  ON "search_documents" USING GIN ("search_vector");

-- 3. Enable pg_trgm for fuzzy / partial-match search (LIKE '%term%')
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 4. GIN trigram index on searchText for ILIKE / similarity queries
CREATE INDEX "search_documents_searchText_trgm_idx"
  ON "search_documents" USING GIN ("searchText" gin_trgm_ops);
