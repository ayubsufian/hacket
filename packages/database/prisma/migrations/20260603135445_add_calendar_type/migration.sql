-- CreateEnum
CREATE TYPE "CalendarType" AS ENUM ('GREGORIAN', 'ETHIOPIAN');

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "preferred_calendar" "CalendarType" NOT NULL DEFAULT 'GREGORIAN';
