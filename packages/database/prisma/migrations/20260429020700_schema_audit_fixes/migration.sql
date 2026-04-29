-- CreateEnum
CREATE TYPE "TeamMemberRole" AS ENUM ('LEADER', 'MEMBER');

-- CreateEnum
CREATE TYPE "OrgMemberRole" AS ENUM ('ADMIN', 'MEMBER');

-- DropForeignKey
ALTER TABLE "discussion_comments" DROP CONSTRAINT "discussion_comments_author_id_fkey";

-- DropForeignKey
ALTER TABLE "discussions" DROP CONSTRAINT "discussions_author_id_fkey";

-- DropForeignKey
ALTER TABLE "event_feedbacks" DROP CONSTRAINT "event_feedbacks_hackathon_id_fkey";

-- DropForeignKey
ALTER TABLE "event_feedbacks" DROP CONSTRAINT "event_feedbacks_user_id_fkey";

-- DropForeignKey
ALTER TABLE "hackathons" DROP CONSTRAINT "hackathons_organizer_id_fkey";

-- DropForeignKey
ALTER TABLE "scores" DROP CONSTRAINT "scores_judge_id_fkey";

-- DropIndex
DROP INDEX "submissions_hackathon_id_rank_idx";

-- AlterTable
ALTER TABLE "certificates" ALTER COLUMN "award_tier" SET NOT NULL,
ALTER COLUMN "award_tier" SET DEFAULT 'general';

-- AlterTable
ALTER TABLE "discussion_comments" ALTER COLUMN "author_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "discussions" ALTER COLUMN "author_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "hackathons" DROP COLUMN "is_feedback_released",
DROP COLUMN "is_scoreboard_published";

-- AlterTable
ALTER TABLE "organization_members" DROP COLUMN "role",
ADD COLUMN     "role" "OrgMemberRole" NOT NULL DEFAULT 'MEMBER';

-- AlterTable
ALTER TABLE "submissions" DROP COLUMN "final_score",
DROP COLUMN "rank";

-- AlterTable
ALTER TABLE "team_members" DROP COLUMN "role",
ADD COLUMN     "role" "TeamMemberRole" NOT NULL DEFAULT 'MEMBER';

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_name_channel_key" ON "notification_templates"("name", "channel");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "recommendations_hackathon_id_idx" ON "recommendations"("hackathon_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- AddForeignKey
ALTER TABLE "hackathons" ADD CONSTRAINT "hackathons_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_histories" ADD CONSTRAINT "submission_histories_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_judge_id_fkey" FOREIGN KEY ("judge_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archive_jobs" ADD CONSTRAINT "archive_jobs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archive_records" ADD CONSTRAINT "archive_records_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussions" ADD CONSTRAINT "discussions_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussions" ADD CONSTRAINT "discussions_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_comments" ADD CONSTRAINT "discussion_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_comments" ADD CONSTRAINT "discussion_comments_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_feedbacks" ADD CONSTRAINT "event_feedbacks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_feedbacks" ADD CONSTRAINT "event_feedbacks_hackathon_id_fkey" FOREIGN KEY ("hackathon_id") REFERENCES "hackathons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
