/*
  Warnings:

  - You are about to drop the column `search_vector` on the `search_documents` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "search_documents_searchText_trgm_idx";

-- DropIndex
DROP INDEX "search_documents_search_vector_idx";

-- AlterTable
ALTER TABLE "search_documents" DROP COLUMN "search_vector";
