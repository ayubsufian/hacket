-- DropIndex (redundant — subsumed by composite index scores_judge_id_createdAt_idx)
DROP INDEX "scores_judge_id_idx";

-- DropIndex (redundant — source enum already encodes archived state)
DROP INDEX "search_documents_source_is_archived_idx";

-- AlterTable (remove unnecessary column — source enum is the single source of truth)
ALTER TABLE "search_documents" DROP COLUMN "is_archived";
