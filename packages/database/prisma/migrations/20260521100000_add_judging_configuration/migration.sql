CREATE TYPE "JudgingMode" AS ENUM (
  'ALL_JUDGES_ALL_SUBMISSIONS',
  'ASSIGNED_JUDGES',
  'MINIMUM_REVIEWS'
);

ALTER TABLE "hackathons"
  ADD COLUMN "judging_mode" "JudgingMode" NOT NULL DEFAULT 'MINIMUM_REVIEWS',
  ADD COLUMN "required_reviews_per_submission" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN "effective_required_reviews_per_submission" INTEGER;

CREATE TABLE "judging_assignments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "hackathon_id" UUID NOT NULL,
  "submission_id" UUID NOT NULL,
  "judge_id" UUID NOT NULL,
  "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "assigned_by" UUID,

  CONSTRAINT "judging_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "judging_assignments_submission_id_judge_id_key"
  ON "judging_assignments"("submission_id", "judge_id");

CREATE INDEX "judging_assignments_hackathon_id_idx"
  ON "judging_assignments"("hackathon_id");

CREATE INDEX "judging_assignments_judge_id_idx"
  ON "judging_assignments"("judge_id");

ALTER TABLE "judging_assignments"
  ADD CONSTRAINT "judging_assignments_hackathon_id_fkey"
  FOREIGN KEY ("hackathon_id") REFERENCES "hackathons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "judging_assignments"
  ADD CONSTRAINT "judging_assignments_submission_id_fkey"
  FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "judging_assignments"
  ADD CONSTRAINT "judging_assignments_judge_id_fkey"
  FOREIGN KEY ("judge_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
