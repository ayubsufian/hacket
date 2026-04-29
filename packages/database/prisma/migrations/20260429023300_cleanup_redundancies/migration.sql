-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- DropIndex (redundant — @unique on token already creates an implicit index)
DROP INDEX "staff_invitations_token_idx";

-- Backfill NULLs before making expires_at required (default: 30 days from now)
UPDATE "admin_invitations" SET "expires_at" = NOW() + INTERVAL '30 days' WHERE "expires_at" IS NULL;

-- AlterTable
ALTER TABLE "admin_invitations" ALTER COLUMN "expires_at" SET NOT NULL;

-- AlterTable: consolidate IssuanceJobStatus → JobStatus
ALTER TABLE "certificate_issuance_jobs" DROP COLUMN "status",
ADD COLUMN     "status" "JobStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable: consolidate AnalyticsJobStatus → JobStatus
ALTER TABLE "analytics_jobs" DROP COLUMN "status",
ADD COLUMN     "status" "JobStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable: consolidate ArchiveJobStatus → JobStatus
ALTER TABLE "archive_jobs" DROP COLUMN "status",
ADD COLUMN     "status" "JobStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable: remove denormalized metric columns (metrics JSON is single source of truth)
ALTER TABLE "event_analytics_snapshots" DROP COLUMN "avg_judge_score",
DROP COLUMN "avg_team_size",
DROP COLUMN "judge_count",
DROP COLUMN "registration_count",
DROP COLUMN "submission_count",
DROP COLUMN "team_count";

-- AlterTable: constrain User.email to VARCHAR(255) for consistency
ALTER TABLE "users" ALTER COLUMN "email" SET DATA TYPE VARCHAR(255);

-- DropEnum: remove redundant job-status enums
DROP TYPE "AnalyticsJobStatus";
DROP TYPE "ArchiveJobStatus";
DROP TYPE "IssuanceJobStatus";

-- Recreate composite indexes that reference the new status column type
CREATE INDEX "analytics_jobs_hackathon_id_status_idx" ON "analytics_jobs"("hackathon_id", "status");
CREATE INDEX "analytics_jobs_scheduledAt_status_idx" ON "analytics_jobs"("scheduledAt", "status");
CREATE INDEX "archive_jobs_hackathon_id_status_idx" ON "archive_jobs"("hackathon_id", "status");
CREATE INDEX "archive_jobs_scheduledAt_status_idx" ON "archive_jobs"("scheduledAt", "status");
