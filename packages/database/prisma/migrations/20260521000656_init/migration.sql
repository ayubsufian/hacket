-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('REGISTERED', 'CHECKED_IN', 'WITHDRAWN');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "HackathonStatus" ADD VALUE 'UPCOMING';
ALTER TYPE "HackathonStatus" ADD VALUE 'CANCELLED';
ALTER TYPE "HackathonStatus" ADD VALUE 'SUSPENDED';

-- AlterTable
ALTER TABLE "registrations" ADD COLUMN     "checked_in_at" TIMESTAMP(3),
ADD COLUMN     "status" "RegistrationStatus" NOT NULL DEFAULT 'REGISTERED';
