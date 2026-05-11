-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'TRANSLATION_MISSING';
ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_PROVISIONED';
ALTER TYPE "AuditAction" ADD VALUE 'USER_SUSPENDED';
ALTER TYPE "AuditAction" ADD VALUE 'EXPORT_FORMAT_FAILURE';
ALTER TYPE "AuditAction" ADD VALUE 'STAFF_INVITED';
ALTER TYPE "AuditAction" ADD VALUE 'STAFF_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'CERTIFICATE_LINK_FAILURE';
ALTER TYPE "AuditAction" ADD VALUE 'ARCHIVE_FAILURE';
ALTER TYPE "AuditAction" ADD VALUE 'HACKATHON_ARCHIVED';
ALTER TYPE "AuditAction" ADD VALUE 'WARNING_INSUFFICIENT_SCORES';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'DEADLINE_WARNING';
ALTER TYPE "NotificationType" ADD VALUE 'SYSTEM_ALERT';

-- AlterTable
ALTER TABLE "hackathon_tags" ADD COLUMN     "is_pending" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "hackathons" ADD COLUMN     "prerequisites" JSONB;
