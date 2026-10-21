-- Library: archived documents.
ALTER TABLE "Document" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;

-- Writing this week: words added per local day. Earlier days keep 0 (only the day was recorded).
ALTER TABLE "WritingDay" ADD COLUMN "words" INTEGER NOT NULL DEFAULT 0;
