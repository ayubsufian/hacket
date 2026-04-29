-- Drop indexes that are redundant with existing @@unique composite constraints.
-- PostgreSQL's leftmost-prefix rule means the unique index already serves
-- single-column queries on the first column of the composite.

DROP INDEX "scoreboard_entries_hackathon_id_idx";
DROP INDEX "judging_criteria_hackathon_id_idx";
DROP INDEX "bookmarks_user_id_idx";
DROP INDEX "mentor_assignments_mentor_id_idx";
DROP INDEX "organization_members_organization_id_idx";
