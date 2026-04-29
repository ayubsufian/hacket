-- DropIndex
DROP INDEX "certificates_user_id_hackathon_id_type_key";

-- AlterTable
ALTER TABLE "certificates" ADD COLUMN     "award_tier" VARCHAR(50),
DROP COLUMN "type",
ADD COLUMN     "type" "CertificateType" NOT NULL DEFAULT 'CERTIFICATE';

-- CreateTable
CREATE TABLE "recommendations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "hackathon_id" UUID NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "reason" JSONB,
    "is_viewed" BOOLEAN NOT NULL DEFAULT false,
    "is_dismissed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recommendations_user_id_is_viewed_idx" ON "recommendations"("user_id", "is_viewed");

-- CreateIndex
CREATE INDEX "recommendations_user_id_score_idx" ON "recommendations"("user_id", "score");

-- CreateIndex
CREATE UNIQUE INDEX "recommendations_user_id_hackathon_id_key" ON "recommendations"("user_id", "hackathon_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_user_id_hackathon_id_type_award_tier_key" ON "certificates"("user_id", "hackathon_id", "type", "award_tier");

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_hackathon_id_fkey" FOREIGN KEY ("hackathon_id") REFERENCES "hackathons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
