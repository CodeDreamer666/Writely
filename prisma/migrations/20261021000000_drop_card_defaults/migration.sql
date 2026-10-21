-- Card defaults were never set from the app; new cards take their colour from the preset cycle.
ALTER TABLE "Workspace" DROP COLUMN "defaultNoteShape";
ALTER TABLE "Workspace" DROP COLUMN "defaultNoteAppearance";
