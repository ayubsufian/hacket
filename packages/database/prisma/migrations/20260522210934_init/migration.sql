-- AlterTable
ALTER TABLE "hackathons" ADD COLUMN     "default_max_leads" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "default_min_leads" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "staff_role_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hackathon_id" UUID NOT NULL,
    "staff_role" "StaffRole" NOT NULL,
    "min_leads" INTEGER,
    "max_leads" INTEGER,

    CONSTRAINT "staff_role_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_role_configs_hackathon_id_staff_role_key" ON "staff_role_configs"("hackathon_id", "staff_role");

-- AddForeignKey
ALTER TABLE "staff_role_configs" ADD CONSTRAINT "staff_role_configs_hackathon_id_fkey" FOREIGN KEY ("hackathon_id") REFERENCES "hackathons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
